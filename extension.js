const { St, Gio, GLib, Clutter } = imports.gi;
const Main = imports.ui.main;
const Me = imports.misc.extensionUtils.getCurrentExtension();


// Restart GNOME-Shell
// Alt+F2, restart/r
// {HOME}/.local/share/gnome-shell/extensions

// To monitor for bug
// journalctl -f -o cat /usr/bin/gnome-shell


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
let proxyPropId = 0;
let busWatchId = null;

let song_info, container, status_icon;

function playPause() {
    if (proxy === null) {
        return;
    }

    // The wrapper function will assign both synchronous and asynchronous variants
    // of methods on the object
    // try {
    //     let value = proxy.PlayPauseAsync();
    //     print(`PlayPause: ${value}`);
    // } catch (e) {
    //     logError(`PlayPause: ${e.message}`);
    // }

    proxy.PlayPauseRemote((value, error) => {
        if (error !== null) {
            logError(error);
            return;
        }
    });
}

function UpdateMediaInfo() {
    if (proxy === null) {
        return;
    }

    let trackid = proxy.Metadata['mpris:trackid'].unpack()
    let title = proxy.Metadata['xesam:title'].unpack()
    let artist = proxy.Metadata['xesam:artist'].deepUnpack()
    let album = proxy.Metadata['xesam:album'].deepUnpack()
    let playbackStatus = proxy.PlaybackStatus

    if (title === "") {
        song_info.set_text("Spotify");
        status_icon.set_icon_name("media-playback-stop-symbolic");
        return;
    }

    if (trackid.includes("episode")) {
        song_info.set_text(`${album} - ${title}`)
    }
    else {
        song_info.set_text(`${artist} - ${title}`)
    }

    if (playbackStatus === "Playing") {
        status_icon.set_icon_name("media-playback-start-symbolic");
    }
    else {
        status_icon.set_icon_name("media-playback-pause-symbolic");
    }
}

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

    UpdateMediaInfo();

    // To watch property changes, you can connect to the `g-properties-changed`
    // GObject signal with `connect()`
    proxyPropId = proxy.connect('g-properties-changed', (proxy_, changed, invalidated) => {
        UpdateMediaInfo();
    });
}

function onNameVanished(connection, name) {
    print(`"${name}" vanished from the session bus`);

    song_info.set_text("Spotify Offline");
    status_icon.set_icon_name("media-playback-stop-symbolic");

    if (proxy !== null) {
        proxy.disconnect(proxyPropId);
        proxy = null;
    }
}

function init() {
    log(`Initializing extension "${Me.metadata.name}"`);

    status_icon = new St.Icon({
        style_class: 'system-status-icon',
        icon_name: 'process-working'
    });

    song_info = new St.Label({
        text: "Extension loading...",
        y_align: Clutter.ActorAlign.CENTER,
    });

    container = new St.BoxLayout({
        style_class: 'panel-button',
        reactive: true,
        track_hover: true,
    });

    container.add_child(status_icon);
    container.add_child(song_info);

    container.connect("button-press-event", () => {
        playPause();
    });
}

function enable() {
    log(`Enabling extension "${Me.metadata.name}"`);
    Main.panel._centerBox.add_child(container);

    busWatchId = Gio.bus_watch_name(
        Gio.BusType.SESSION,
        'org.mpris.MediaPlayer2.spotify',
        Gio.BusNameWatcherFlags.NONE,
        onNameAppeared,
        onNameVanished
    );
}

function disable() {
    log(`Disabling extension "${Me.metadata.name}"`);
    Gio.bus_unwatch_name(busWatchId)
    Main.panel._centerBox.remove_child(container);
}
