'use strict';

const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;

const ifaceXml = `
<node> 
    <interface name="org.mpris.MediaPlayer2.Player"> 
        <method name="PlayPause"/> 
        <method name="Next"/> 
        <method name="Previous"/> 
        <property name="CanGoNext" type="b" access="read"/>
        <property name="CanGoPrevious" type="b" access="read"/>
        <property name="CanPlay" type="b" access="read"/>
        <property name="Metadata" type="a{sv}" access="read"/>
        <property name="PlaybackStatus" type="s" access="read"/>
    </interface> 
</node>`;

// Pass the XML string to make a re-usable proxy class for an interface proxies.
const TestProxy = Gio.DBusProxy.makeProxyWrapper(ifaceXml);


let proxy = null;
let proxySignalId = 0;
let proxyPropId = 0;


function printProxyData(proxy) {
    let title = proxy.Metadata['xesam:title'].unpack()
    let artist = proxy.Metadata['xesam:artist'].deepUnpack()
    let playbackStatus = proxy.PlaybackStatus

    print(`${playbackStatus}: ${artist} - ${title}`)
}

// These two functions are the callbacks for when either the service appears or
// disappears from the bus. At least one of these two functions will be called
// when you first start watching a name.

// This will be called when a process takes ownership of the name, which is to
// say the service actually become active.
function onNameAppeared(connection, name, name_owner) {
    print(`"${name}" appeared on the session bus`);

    try {
        proxy = new TestProxy(
            Gio.DBus.session,
            'org.mpris.MediaPlayer2.spotify',
            '/org/mpris/MediaPlayer2'
        );
        
    } catch (e) {
        logError(e);
        return;
    }

    printProxyData(proxy);


    // To watch property changes, you can connect to the `g-properties-changed`
    // GObject signal with `connect()`
    proxyPropId = proxy.connect('g-properties-changed', (proxy_, changed, invalidated) => {
        for (let [prop, value] of Object.entries(changed.deepUnpack())) {
            print(`Property '${prop}' changed to '${value.deepUnpack()}'`);
            // print(value.print(true))
        }

        for (let prop of invalidated)
            print(`Property '${prop}' invalidated`);
    });
}

// Likewise, this will be invoked when the process that owned the name releases
// the name.
function onNameVanished(connection, name) {
    print(`"${name}" vanished from the session bus`);

    if (proxy !== null) {
        proxy.disconnectSignal(proxySignalId);
        proxy.disconnect(proxyPropId);
        proxy = null;
    }
}


let busWatchId = Gio.bus_watch_name(
    Gio.BusType.SESSION,
    'org.mpris.MediaPlayer2.spotify',
    Gio.BusNameWatcherFlags.NONE,
    onNameAppeared,
    onNameVanished
);

// Start an event loop
let loop = GLib.MainLoop.new(null, false);
loop.run();
