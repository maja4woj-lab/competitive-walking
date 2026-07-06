const SERVICE_UUID  = '12345678-1234-5678-1234-56789abcdef0';
const CHAR_RX_UUID  = '12345678-1234-5678-1234-56789abcdef1';
const CHAR_TX_UUID  = '12345678-1234-5678-1234-56789abcdef2';

let deviceLeft  = null;
let deviceRight = null;
let charRxLeft  = null;
let charRxRight = null;

let onButtonLeft  = null;
let onButtonRight = null;

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

        await charTx.startNotifications();
        charTx.addEventListener('characteristicvaluechanged', (e) => {
            const msg = new TextDecoder().decode(e.target.value);
            if (msg === 'BUTTON') {
                if (strona === 'LEFT'  && onButtonLeft)  onButtonLeft();
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

        device.addEventListener('gattserverdisconnected', () => {
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

// Kierunkowskaz lewo – LED 100%, wibracje 100%
async function kierunkowskazLewo(wlacz) {
    if (wlacz) {
        await wyslijKomende('LEFT',  'SET:100:100');
        await wyslijKomende('RIGHT', 'SET:0:0');
    } else {
        await wyslijKomende('LEFT',  'SET:0:0');
        await wyslijKomende('RIGHT', 'SET:0:0');
    }
}

// Kierunkowskaz prawo – LED 100%, wibracje 100%
async function kierunkowskazPrawo(wlacz) {
    if (wlacz) {
        await wyslijKomende('RIGHT', 'SET:100:100');
        await wyslijKomende('LEFT',  'SET:0:0');
    } else {
        await wyslijKomende('RIGHT', 'SET:0:0');
        await wyslijKomende('LEFT',  'SET:0:0');
    }
}

async function wylaczObie() {
    await wyslijKomende('LEFT',  'SET:0:0');
    await wyslijKomende('RIGHT', 'SET:0:0');
}

function aktualizujStatusBLE() {
    const elLeft  = document.getElementById('ble-left');
    const elRight = document.getElementById('ble-right');
    if (elLeft)  elLeft.textContent  = deviceLeft  ? '🟢 Lewa'  : '🔴 Lewa';
    if (elRight) elRight.textContent = deviceRight ? '🟢 Prawa' : '🔴 Prawa';
}

function czyPolaczenoLeft()  { return !!deviceLeft; }
function czyPolaczenoRight() { return !!deviceRight; }
