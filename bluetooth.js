// bluetooth.js - obsługa połączenia z rączkami

const SERVICE_UUID  = '12345678-1234-5678-1234-56789abcdef0';
const CHAR_RX_UUID  = '12345678-1234-5678-1234-56789abcdef1'; // telefon → rączka
const CHAR_TX_UUID  = '12345678-1234-5678-1234-56789abcdef2'; // rączka → telefon

let deviceLeft  = null;
let deviceRight = null;
let charRxLeft  = null;
let charRxRight = null;

// Callback który aplikacja może nadpisać
let onButtonLeft  = null;
let onButtonRight = null;

// Połącz z rączką
async function polaczRaczke(strona) {
    try {
        const device = await navigator.bluetooth.requestDevice({
            filters: [{ name: `HandleController ${strona}` }],
            optionalServices: [SERVICE_UUID]
        });

        const server  = await device.gatt.connect();
        const service = await server.getPrimaryService(SERVICE_UUID);
        const charRx  = await service.getCharacteristic(CHAR_RX_UUID);
        const charTx  = await service.getCharacteristic(CHAR_TX_UUID);

        // Włącz notyfikacje (przycisk → telefon)
        await charTx.startNotifications();
        charTx.addEventListener('characteristicvaluechanged', (e) => {
            const msg = new TextDecoder().decode(e.target.value);
            if (msg === 'BUTTON') {
                if (strona === 'LEFT' && onButtonLeft)  onButtonLeft();
                if (strona === 'RIGHT' && onButtonRight) onButtonRight();
            }
        });

        if (strona === 'LEFT') {
            deviceLeft = device;
            charRxLeft = charRx;
        } else {
            deviceRight = device;
            charRxRight = charRx;
        }

        // Obsłuż rozłączenie
        device.addEventListener('gattserverdisconnected', () => {
            console.log(`Rączka ${strona} rozłączona`);
            if (strona === 'LEFT')  { deviceLeft = null;  charRxLeft = null; }
            if (strona === 'RIGHT') { deviceRight = null; charRxRight = null; }
            aktualizujStatusBLE();
        });

        aktualizujStatusBLE();
        return true;

    } catch(err) {
        console.error(`Błąd połączenia ${strona}:`, err);
        return false;
    }
}

// Wyślij komendę do rączki
async function wyslijKomende(strona, komenda) {
    const char = strona === 'LEFT' ? charRxLeft : charRxRight;
    if (!char) return;
    try {
        const encoder = new TextEncoder();
        await char.writeValueWithoutResponse(encoder.encode(komenda));
    } catch(err) {
        console.error(`Błąd wysyłania do ${strona}:`, err);
    }
}

// Kierunkowskaz lewo
async function kierunkowskazLewo(wlacz) {
    await wyslijKomende('LEFT', wlacz ? 'ON' : 'OFF');
    await wyslijKomende('RIGHT', 'OFF');
}

// Kierunkowskaz prawo
async function kierunkowskazPrawo(wlacz) {
    await wyslijKomende('RIGHT', wlacz ? 'ON' : 'OFF');
    await wyslijKomende('LEFT', 'OFF');
}

// Wyłącz obie rączki
async function wylaczObie() {
    await wyslijKomende('LEFT', 'OFF');
    await wyslijKomende('RIGHT', 'OFF');
}

// Aktualizuj status w UI
function aktualizujStatusBLE() {
    const elLeft  = document.getElementById('ble-left');
    const elRight = document.getElementById('ble-right');
    if (elLeft)  elLeft.textContent  = deviceLeft  ? '🟢 Lewa'  : '🔴 Lewa';
    if (elRight) elRight.textContent = deviceRight ? '🟢 Prawa' : '🔴 Prawa';
}

function czyPolaczenoLeft()  { return !!deviceLeft; }
function czyPolaczenoRight() { return !!deviceRight; }
