// --- STATE UI & VARIABEL ---
let dompetAktifId = null;
let editTxId = null; 
let fotoBase64 = ""; 
let statusHapusFotoLama = false; 

// --- FUNGSI CUSTOM POPUP MODAL (PENGGANTI BAWAAN BROWSER) ---
function customAlert(message) {
    return new Promise(resolve => {
        const modal = document.getElementById('modal-alert');
        document.getElementById('alert-msg').innerText = message;
        modal.style.display = 'flex';
        document.getElementById('btn-alert-ok').onclick = () => {
            modal.style.display = 'none';
            resolve();
        }
    });
}

function customConfirm(message) {
    return new Promise(resolve => {
        const modal = document.getElementById('modal-confirm');
        document.getElementById('confirm-msg').innerText = message;
        modal.style.display = 'flex';
        
        document.getElementById('btn-confirm-yes').onclick = () => {
            modal.style.display = 'none';
            resolve(true);
        }
        document.getElementById('btn-confirm-no').onclick = () => {
            modal.style.display = 'none';
            resolve(false);
        }
    });
}

function customPrompt(message, defaultVal = "") {
    return new Promise(resolve => {
        const modal = document.getElementById('modal-prompt');
        document.getElementById('prompt-msg').innerText = message;
        const input = document.getElementById('prompt-input');
        input.value = defaultVal;
        modal.style.display = 'flex';
        input.focus();
        
        document.getElementById('btn-prompt-yes').onclick = () => {
            modal.style.display = 'none';
            resolve(input.value.trim());
        }
        document.getElementById('btn-prompt-no').onclick = () => {
            modal.style.display = 'none';
            resolve(null);
        }
    });
}

// --- SISTEM TEMA ---
function toggleTema() {
    const body = document.body;
    const isDark = body.getAttribute('data-theme') === 'dark';
    if (isDark) {
        body.removeAttribute('data-theme');
        document.getElementById('btn-tema').innerText = '🌙';
    } else {
        body.setAttribute('data-theme', 'dark');
        document.getElementById('btn-tema').innerText = '☀️';
    }
}

// --- KONVERSI FOTO KE BASE64 ---
document.getElementById('input-foto').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            fotoBase64 = event.target.result;
            statusHapusFotoLama = false; 
        };
        reader.readAsDataURL(file);
    } else {
        fotoBase64 = "";
    }
});

// --- NAVIGATION & ROUTING BAWAH ---
function switchTab(tabId) {
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    document.getElementById('nav-' + tabId).classList.add('active');

    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
    document.getElementById('tab-' + tabId).classList.add('active');

    if (tabId === 'transaksi') {
        renderRiwayat();
    } else {
        renderDompet();
    }
}

function initApp() {
    switchTab('beranda');
}

// --- FUNGSI FORMAT TANGGAL DD/MM/YYYY ---
function formatTanggal(tglStr) {
    if (!tglStr) return '-';
    const parts = tglStr.split('-');
    // Pastikan format asli adalah YYYY-MM-DD
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return tglStr;
}

// --- LOGIKA DOMPET ---
function hitungSaldoKeseluruhan() {
    let totalGabungan = 0;
    dataBukuUang.dompet.forEach(d => {
        d.transaksi.forEach(t => {
            if (t.jenis === 'masuk') totalGabungan += t.nominal;
            else totalGabungan -= t.nominal;
        });
    });
    document.getElementById('saldo-keseluruhan').innerText = formatRupiah(totalGabungan);
}

async function tambahDompet() {
    const nama = document.getElementById('nama-dompet-baru').value.trim();
    if (!nama) return customAlert("Tulis nama dompetnya dulu ya! ➕");

    const dompetBaru = {
        id: Date.now().toString(),
        nama: nama,
        transaksi: []
    };
    dataBukuUang.dompet.push(dompetBaru);
    document.getElementById('nama-dompet-baru').value = '';
    
    simpanKeDB(() => {
        renderDompet();
        pilihDompet(dompetBaru.id); 
    });
}

function renderDompet() {
    const list = document.getElementById('list-dompet');
    list.innerHTML = '';
    
    if (dataBukuUang.dompet.length === 0) {
        list.innerHTML = "<div style='grid-column: 1/-1; text-align:center; padding: 30px; color: var(--text-muted); font-size: 0.9rem;'>Belum ada dompet. Bikin dulu yuk!</div>";
    } else {
        dataBukuUang.dompet.forEach(d => {
            let saldo = 0;
            d.transaksi.forEach(t => { if(t.jenis==='masuk') saldo+=t.nominal; else saldo-=t.nominal; });

            const div = document.createElement('div');
            div.className = 'card wallet-card';
            div.onclick = () => pilihDompet(d.id);
            div.innerHTML = `
                <h3>💳 ${d.nama}</h3>
                <div class="w-saldo">${formatRupiah(saldo)}</div>
            `;
            list.appendChild(div);
        });
    }
    hitungSaldoKeseluruhan();
}

function pilihDompet(id) {
    dompetAktifId = id;
    batalEdit();
    switchTab('transaksi'); 
}

async function editDompet() {
    if (!dompetAktifId) return;
    const dompet = dataBukuUang.dompet.find(d => d.id === dompetAktifId);
    
    const namaBaru = await customPrompt("Ubah nama dompet menjadi:", dompet.nama);
    if (namaBaru) {
        dompet.nama = namaBaru;
        simpanKeDB(() => { renderRiwayat(); });
    }
}

async function hapusDompet() {
    if (!dompetAktifId) return;
    const dompet = dataBukuUang.dompet.find(d => d.id === dompetAktifId);
    
    const isYakin = await customConfirm(`Hapus permanen dompet "${dompet.nama}" beserta semua isinya?`);
    if (isYakin) {
        dataBukuUang.dompet = dataBukuUang.dompet.filter(d => d.id !== dompetAktifId);
        dompetAktifId = null;
        simpanKeDB(() => { switchTab('beranda'); });
    }
}

// --- TRANSAKSI & FOTO ---
function hapusFotoSaatEdit() {
    statusHapusFotoLama = true;
    fotoBase64 = "";
    document.getElementById('area-edit-foto').style.display = 'none';
    document.getElementById('input-foto').value = ""; 
}

function simpanTransaksi(e) {
    e.preventDefault();
    const tgl = document.getElementById('input-tgl').value;
    const jenis = document.getElementById('input-jenis').value;
    const nominal = parseInt(document.getElementById('input-nominal').value);
    const catatan = document.getElementById('input-catatan').value;

    const dompet = dataBukuUang.dompet.find(d => d.id === dompetAktifId);

    if (editTxId) {
        const txIndex = dompet.transaksi.findIndex(t => t.id === editTxId);
        
        let finalFoto = dompet.transaksi[txIndex].foto; 
        if (statusHapusFotoLama) finalFoto = ""; 
        else if (fotoBase64 !== "") finalFoto = fotoBase64; 

        dompet.transaksi[txIndex] = { ...dompet.transaksi[txIndex], tgl, jenis, nominal, catatan, foto: finalFoto };
    } else {
        const txBaru = { id: Date.now().toString(), tgl, jenis, nominal, catatan, foto: fotoBase64 };
        dompet.transaksi.push(txBaru);
    }

    batalEdit();
    simpanKeDB(() => { renderRiwayat(); });
}

async function hapusTransaksi(idTx) {
    const isYakin = await customConfirm("Hapus data catatan transaksi ini?");
    if(isYakin) {
        const dompet = dataBukuUang.dompet.find(d => d.id === dompetAktifId);
        dompet.transaksi = dompet.transaksi.filter(t => t.id !== idTx);
        simpanKeDB(() => { renderRiwayat(); });
    }
}

function siapkanEdit(idTx) {
    const dompet = dataBukuUang.dompet.find(d => d.id === dompetAktifId);
    const tx = dompet.transaksi.find(t => t.id === idTx);
    
    document.getElementById('input-tgl').value = tx.tgl;
    document.getElementById('input-jenis').value = tx.jenis;
    document.getElementById('input-nominal').value = tx.nominal;
    document.getElementById('input-catatan').value = tx.catatan;
    
    editTxId = tx.id;
    fotoBase64 = ""; 
    statusHapusFotoLama = false;
    document.getElementById('input-foto').value = ""; 
    
    const areaEditFoto = document.getElementById('area-edit-foto');
    if(tx.foto) {
        document.getElementById('preview-foto-lama').src = tx.foto;
        areaEditFoto.style.display = 'flex';
    } else {
        areaEditFoto.style.display = 'none';
    }

    const btnSimpan = document.getElementById('btn-simpan-tx');
    btnSimpan.innerHTML = "✏️ Update Data";
    btnSimpan.style.background = "var(--success)"; 
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function batalEdit() {
    document.getElementById('form-transaksi').reset();
    editTxId = null;
    fotoBase64 = "";
    statusHapusFotoLama = false;
    document.getElementById('area-edit-foto').style.display = 'none';
    
    const btnSimpan = document.getElementById('btn-simpan-tx');
    btnSimpan.innerHTML = "💾 Simpan";
    btnSimpan.style.background = ""; 
}

// --- FILTER & RENDER TABEL ---
function formatRupiah(angka) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
}

function renderRiwayat() {
    const stateKosong = document.getElementById('state-kosong-transaksi');
    const areaAktif = document.getElementById('area-transaksi-aktif');

    if (!dompetAktifId) {
        stateKosong.style.display = 'block';
        areaAktif.style.display = 'none';
        return;
    }

    stateKosong.style.display = 'none';
    areaAktif.style.display = 'block';

    const dompet = dataBukuUang.dompet.find(d => d.id === dompetAktifId);
    document.getElementById('judul-dompet-aktif').innerText = dompet.nama;

    const tbody = document.getElementById('list-riwayat-table');
    const cariTeks = document.getElementById('cari-teks').value.toLowerCase();
    const filterWaktu = document.getElementById('filter-waktu').value;
    const filterJenis = document.getElementById('filter-jenis').value; 
    
    let saldoTotal = 0;
    let totalMasuk = 0;
    let totalKeluar = 0;
    let htmlTabel = "";

    const hariIni = new Date();
    const strTahunIni = hariIni.getFullYear().toString();
    const strBulanIni = (hariIni.getMonth() + 1).toString().padStart(2, '0');
    const strHariIni = hariIni.getDate().toString().padStart(2, '0');
    const formatHariIni = `${strTahunIni}-${strBulanIni}-${strHariIni}`;
    const formatBulanIni = `${strTahunIni}-${strBulanIni}`;

    let txSort = [...dompet.transaksi].sort((a,b) => b.id - a.id);

    dompet.transaksi.forEach(t => {
        if(t.jenis === 'masuk') saldoTotal += t.nominal;
        else saldoTotal -= t.nominal;
    });
    document.getElementById('saldo-total').innerText = formatRupiah(saldoTotal);

    txSort = txSort.filter(t => {
        const cocokTeks = t.catatan.toLowerCase().includes(cariTeks) || t.nominal.toString().includes(cariTeks);
        let cocokWaktu = true;
        let cocokJenis = t.jenis === filterJenis || filterJenis === 'semua';
        
        if (filterWaktu === 'harian') cocokWaktu = t.tgl === formatHariIni;
        else if (filterWaktu === 'bulanan') cocokWaktu = t.tgl.startsWith(formatBulanIni);
        else if (filterWaktu === 'tahunan') cocokWaktu = t.tgl.startsWith(strTahunIni);

        return cocokTeks && cocokWaktu && cocokJenis;
    });

    txSort.forEach(t => {
        if (t.jenis === 'masuk') totalMasuk += t.nominal;
        else totalKeluar += t.nominal;
    });

    document.getElementById('total-masuk').innerText = formatRupiah(totalMasuk);
    document.getElementById('total-keluar').innerText = formatRupiah(totalKeluar);

    if (txSort.length === 0) {
        tbody.innerHTML = "<tr><td colspan='5' style='padding: 30px; color: var(--text-muted);'>Tidak ada data ditemukan. 🍃</td></tr>";
        return;
    }

    txSort.forEach(t => {
        const imgTag = t.foto ? `<img src="${t.foto}" class="img-thumb" onclick="bukaFoto('${t.foto}')">` : '-';
        const isMasuk = t.jenis === 'masuk';
        const strNominal = (isMasuk ? '+ ' : '- ') + formatRupiah(t.nominal);
        const rowClass = isMasuk ? 'dt-masuk' : 'dt-keluar';

        // Panggil fungsi formatTanggal untuk merubah YYYY-MM-DD menjadi DD/MM/YYYY
        htmlTabel += `
        <tr class="${rowClass}">
            <td>${formatTanggal(t.tgl)}</td>
            <td>${t.catatan}</td>
            <td>${strNominal}</td>
            <td>${imgTag}</td>
            <td>
                <div class="td-actions">
                    <button onclick="siapkanEdit('${t.id}')" class="btn-outline-sm">✏️ Edit</button>
                    <button onclick="hapusTransaksi('${t.id}')" class="btn-danger-sm">🗑️</button>
                </div>
            </td>
        </tr>`;
    });

    tbody.innerHTML = htmlTabel;
}

// --- FUNGSI LIHAT FOTO ---
function bukaFoto(src) {
    document.getElementById('img-full-view').src = src;
    document.getElementById('modal-foto').style.display = 'flex';
}

function tutupFoto() {
    document.getElementById('modal-foto').style.display = 'none';
}

window.onload = function() {
    initDatabase(); 
};