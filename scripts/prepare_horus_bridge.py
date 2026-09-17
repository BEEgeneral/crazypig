"""Create a derived Pine script; leave the supplied original untouched."""
from pathlib import Path
import sys

source = Path(sys.argv[1]).read_text()
settings = '''
// CrazyPig transport only. No orders, account credentials or rule changes.
cpEnabled = input.bool(false, "Enviar estado a CrazyPig", group="6 · CrazyPig")
cpKey = input.string("", "Clave del receptor CrazyPig", group="6 · CrazyPig", tooltip="Clave hexadecimal local; nunca la contraseña de TradingView ni del bróker. No publiques esta clave.")
cpNumber(float value) =>
    na(value) ? "null" : str.tostring(value, "#.########")
'''
anchor = '// Session key uses calendar dates at noon, avoiding fixed-hour DST arithmetic.'
assert source.count(anchor) == 1
source = source.replace(anchor, settings + '\n' + anchor)
# Keep existing human alerts in ordinary use. In transport mode, use a single
# JSON alert per 5m close so a legacy text alert cannot consume the close slot.
source = source.replace('if enableAlerts and ', 'if enableAlerts and not cpEnabled and ')
source += '''

// A bar-close snapshot is not a tick feed or a broker fill confirmation.
// Recreate the TradingView alert after changing this script or its inputs.
if cpEnabled and str.length(cpKey) == 64 and chartOK and barstate.isrealtime and barstate.isconfirmed
    string cpStage = closedSignal ? "closed" : st == 3 ? (direction == 1 ? "long" : "short") : pendingRetest ? "retest" : st == 2 ? (na(trigger) ? "sweep" : "structure") : st <= 1 ? "range" : "flat"
    int cpDirection = pendingRetest ? pendingDirection : direction
    float cpEntry = pendingRetest ? pendingEntry : entry
    float cpStop = pendingRetest ? pendingStop : stop
    float cpTarget = pendingRetest ? pendingTarget : target
    int cpQty = pendingRetest ? pendingQty : st == 3 or closedSignal ? qty : 0
    string cpPayload = "{\\"version\\":1,\\"key\\":\\"" + cpKey + "\\",\\"id\\":\\"" + syminfo.tickerid + ":" + str.tostring(time_close) + "\\",\\"symbol\\":\\"" + syminfo.tickerid + "\\",\\"time\\":" + str.tostring(timenow)
    cpPayload += ",\\"stage\\":\\"" + cpStage + "\\",\\"direction\\":" + str.tostring(cpDirection) + ",\\"maxContracts\\":" + str.tostring(cpQty)
    cpPayload += ",\\"price\\":" + cpNumber(close) + ",\\"rangeHigh\\":" + cpNumber(rangeHi) + ",\\"rangeLow\\":" + cpNumber(rangeLo)
    cpPayload += ",\\"entry\\":" + cpNumber(cpEntry) + ",\\"stop\\":" + cpNumber(cpStop) + ",\\"target\\":" + cpNumber(cpTarget) + "}"
    alert(cpPayload, alert.freq_once_per_bar_close)
'''
Path(__file__).resolve().parents[1].joinpath('server/Horus-CrazyPig.pine').write_text(source)
