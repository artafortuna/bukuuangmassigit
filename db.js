// --- MANAJEMEN INDEXEDDB (BRANKAS LOKAL) ---

let dataBukuUang = { dompet: [] }; 
let db; 

function initDatabase() {
    const request = indexedDB.open('BukuUangDB', 1);

    request.onupgradeneeded = function(e) {
        db = e.target.result;
        if (!db.objectStoreNames.contains('store')) {
            db.createObjectStore('store', { keyPath: 'id' });
        }
    };

    request.onsuccess = function(e) {
        db = e.target.result;
        muatDariDB();
    };

    request.onerror = function(e) {
        console.error("IndexedDB Error:", e);
        customAlert("Gagal memuat penyimpanan lokal. Pastikan browser Anda mendukung IndexedDB.");
    };
}

function muatDariDB() {
    const tx = db.transaction('store', 'readonly');
    const store = tx.objectStore('store');
    const req = store.get('mainData');

    req.onsuccess = function() {
        if (req.result) {
            dataBukuUang = req.result.data;
        }
        
        // Matikan loading, inisiasi awal tampilan
        document.getElementById('db-loading').style.display = 'none';
        document.getElementById('app-content').style.display = 'block';
        initApp();
    };
}

function simpanKeDB(callback) {
    const tx = db.transaction('store', 'readwrite');
    const store = tx.objectStore('store');
    const req = store.put({ id: 'mainData', data: dataBukuUang });
    
    req.onsuccess = function() {
        if (callback) callback();
    };
}