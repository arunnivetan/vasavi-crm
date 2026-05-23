// Database Manager for HardwareCRM (LocalStorage + IndexedDB for binary image storage)

const DB_NAME = 'HardwareCRM_FilesDB';
const DB_VERSION = 1;
const STORE_NAME = 'customer_images';

// Initialize IndexedDB for Site Photos / Blueprints (Bypasses LocalStorage 5MB limit)
export const initIndexedDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('IndexedDB open error:', event);
      reject('Failed to open IndexedDB');
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('customerId', 'customerId', { unique: false });
      }
    };
  });
};

// Upload site image to IndexedDB
export const saveImageToDB = async (customerId, file, imageType, uploadedBy = 'System') => {
  const db = await initIndexedDB();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const newImage = {
        customerId,
        imageUrl: reader.result, // base64 string
        imageType, // 'Blueprint', 'Site Photo', 'Quotation', 'Invoice', 'Bill', 'Progress'
        uploadedAt: new Date().toISOString(),
        uploadedBy,
        fileName: file.name
      };

      const request = store.add(newImage);

      request.onsuccess = (event) => {
        resolve({ ...newImage, id: event.target.result });
      };

      request.onerror = (event) => {
        console.error('Failed to save image:', event);
        reject('Error saving image');
      };
    };
    reader.onerror = (error) => reject(error);
  });
};

// Retrieve all images for a customer
export const getImagesFromDB = async (customerId) => {
  const db = await initIndexedDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('customerId');
    const request = index.getAll(customerId);

    request.onsuccess = (event) => {
      // Sort by upload date descending
      const sorted = (event.target.result || []).sort(
        (a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)
      );
      resolve(sorted);
    };

    request.onerror = (event) => {
      console.error('Failed to get images:', event);
      reject('Error loading images');
    };
  });
};

// Delete an image by ID
export const deleteImageFromDB = async (id) => {
  const db = await initIndexedDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve(true);
    };

    request.onerror = (event) => {
      console.error('Failed to delete image:', event);
      reject('Error deleting image');
    };
  });
};

// List of common hardware & plywood products for suggestion autocompletes
export const COMMON_PRODUCTS = [
  '18mm Waterproof Marine Plywood',
  '12mm Commercial Plywood',
  '6mm Commercial Plywood',
  '8mm MDF Board',
  '1mm Glossy Laminate Sheet (White)',
  '1mm Textured Laminate Sheet (Oak)',
  'Auto Hinges - Soft Close (Sets)',
  'Auto Hinges - Normal (Sets)',
  'Telescopic Drawer Slides 18" (Pair)',
  'Telescopic Drawer Slides 20" (Pair)',
  'Designer Door Handle 8" (Brass)',
  'Designer Door Handle 10" (Brass)',
  'Mortise Door Cylinder Lock (Gold)',
  'Tower Bolts 6" (Steel)',
  'Silicon Sealant Clear GP',
  'Waterproof Plywood Adhesive (WPC)'
];

// --- LOCAL STORAGE DATA DEFINITIONS ---

const KEYS = {
  CUSTOMERS: 'hw_crm_customers',
  ACTIVITIES: 'hw_crm_activities',
  NOTES: 'hw_crm_notes',
  PAYMENTS: 'hw_crm_payments',
  REMINDERS: 'hw_crm_reminders',
  STAGES: 'hw_crm_stages'
};

// Default Pipeline Stages
const DEFAULT_STAGES = [
  { stageName: 'New Lead', stageColor: '#3B82F6', stageOrder: 1 },
  { stageName: 'Contacted', stageColor: '#6366F1', stageOrder: 2 },
  { stageName: 'Site Visit', stageColor: '#A855F7', stageOrder: 3 },
  { stageName: 'Quotation Sent', stageColor: '#F59E0B', stageOrder: 4 },
  { stageName: 'Negotiation', stageColor: '#EC4899', stageOrder: 5 },
  { stageName: 'Confirmed', stageColor: '#10B981', stageOrder: 6 },
  { stageName: 'Delivery', stageColor: '#14B8A6', stageOrder: 7 },
  { stageName: 'Completed', stageColor: '#059669', stageOrder: 8 },
  { stageName: 'Lost', stageColor: '#EF4444', stageOrder: 9 }
];

// Pre-seeded Customers (empty for production)
const SEED_CUSTOMERS = [];
const SEED_ACTIVITIES = [];
const SEED_NOTES = [];
const SEED_REMINDERS = [];

// Helper to initialize and retrieve LocalStorage data
export const getStorageData = (key, defaultVal) => {
  const val = localStorage.getItem(key);
  if (!val) {
    localStorage.setItem(key, JSON.stringify(defaultVal));
    return defaultVal;
  }
  try {
    return JSON.parse(val);
  } catch (e) {
    console.error(`Error parsing LocalStorage key: ${key}`, e);
    return defaultVal;
  }
};

export const setStorageData = (key, val) => {
  localStorage.setItem(key, JSON.stringify(val));
};

// Core Database initialization wrapper
export const initLocalStorageDB = () => {
  // One-time automated cache migration to clean database for production
  const rawCust = localStorage.getItem(KEYS.CUSTOMERS);
  if (rawCust && rawCust.includes('cust_1')) {
    localStorage.removeItem(KEYS.CUSTOMERS);
    localStorage.removeItem(KEYS.ACTIVITIES);
    localStorage.removeItem(KEYS.NOTES);
    localStorage.removeItem(KEYS.PAYMENTS);
    localStorage.removeItem(KEYS.REMINDERS);
    // Reload to apply empty states
    window.location.reload();
  }

  const customers = getStorageData(KEYS.CUSTOMERS, SEED_CUSTOMERS);
  const activities = getStorageData(KEYS.ACTIVITIES, SEED_ACTIVITIES);
  const notes = getStorageData(KEYS.NOTES, SEED_NOTES);
  const reminders = getStorageData(KEYS.REMINDERS, SEED_REMINDERS);
  const stages = getStorageData(KEYS.STAGES, DEFAULT_STAGES);

  // Initialize empty payments history if not exists
  const payments = getStorageData(KEYS.PAYMENTS, []);

  return { customers, activities, notes, payments, reminders, stages };
};

// Database hooks / raw mutations (will be exposed nicely by our React Context)
export const dbAPI = {
  KEYS,
  
  getCustomers: () => getStorageData(KEYS.CUSTOMERS, SEED_CUSTOMERS),
  saveCustomers: (data) => setStorageData(KEYS.CUSTOMERS, data),

  getActivities: () => getStorageData(KEYS.ACTIVITIES, SEED_ACTIVITIES),
  saveActivities: (data) => setStorageData(KEYS.ACTIVITIES, data),
  addActivity: (activity) => {
    const data = getStorageData(KEYS.ACTIVITIES, SEED_ACTIVITIES);
    const newActivity = { ...activity, timestamp: new Date().toISOString() };
    data.unshift(newActivity); // Newest first
    setStorageData(KEYS.ACTIVITIES, data);
    return newActivity;
  },

  getNotes: () => getStorageData(KEYS.NOTES, SEED_NOTES),
  saveNotes: (data) => setStorageData(KEYS.NOTES, data),
  addNote: (note) => {
    const data = getStorageData(KEYS.NOTES, SEED_NOTES);
    const newNote = {
      ...note,
      id: 'note_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      timestamp: new Date().toISOString()
    };
    data.unshift(newNote);
    setStorageData(KEYS.NOTES, data);
    return newNote;
  },

  getPayments: () => getStorageData(KEYS.PAYMENTS, []),
  savePayments: (data) => setStorageData(KEYS.PAYMENTS, data),
  addPaymentRecord: (payment) => {
    const data = getStorageData(KEYS.PAYMENTS, []);
    const newPayment = {
      ...payment,
      id: 'pay_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      timestamp: new Date().toISOString()
    };
    data.unshift(newPayment);
    setStorageData(KEYS.PAYMENTS, data);
    return newPayment;
  },

  getReminders: () => getStorageData(KEYS.REMINDERS, SEED_REMINDERS),
  saveReminders: (data) => setStorageData(KEYS.REMINDERS, data),
  addReminder: (reminder) => {
    const data = getStorageData(KEYS.REMINDERS, SEED_REMINDERS);
    const newReminder = {
      ...reminder,
      id: 'rem_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      status: 'Pending'
    };
    data.push(newReminder);
    setStorageData(KEYS.REMINDERS, data);
    return newReminder;
  },

  getStages: () => getStorageData(KEYS.STAGES, DEFAULT_STAGES),
  saveStages: (data) => setStorageData(KEYS.STAGES, data)
};
