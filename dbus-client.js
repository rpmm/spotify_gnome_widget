// SPDX-License-Identifier: MIT OR LGPL-2.0-or-later
// SPDX-FileCopyrightText: 2020 Andy Holmes <andrew.g.r.holmes@gmail.com>

'use strict';

const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;

// https://gitlab.gnome.org/GNOME/gjs/-/blob/master/examples/dbus-client.js

// To run this
// gjs-console dbus-client.js


/*
 * An XML DBus Interface
 */
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
</node>
`;



// Pass the XML string to make a re-usable proxy class for an interface proxies.
const TestProxy = Gio.DBusProxy.makeProxyWrapper(ifaceXml);


let proxy = null;
let proxySignalId = 0;
let proxyPropId = 0;


// Watching a name on DBus. Another option is to create a proxy with the
// `Gio.DBusProxyFlags.DO_NOT_AUTO_START` flag and watch the `g-name-owner`
// property.
function onNameAppeared(connection, name, _owner) {
    print(`"${name}" appeared on the session bus`);

    // If creating a proxy synchronously, errors will be thrown as normal
    try {
        proxy = new TestProxy(
            Gio.DBus.session,
            'org.mpris.MediaPlayer2',
            '/org/mpris/MediaPlayer2/Player'
        );
    } catch (e) {
        logError(e);
        return;
    }
}

function onNameVanished(connection, name) {
    print(`"${name}" vanished from the session bus`);
    print("vitun vittu");

    if (proxy !== null) {
        proxy.disconnectSignal(proxySignalId);
        proxy.disconnect(proxyPropId);
        proxy = null;
    }
}

let busWatchId = Gio.bus_watch_name(
    Gio.BusType.SESSION,
    'org.mpris.MediaPlayer2',
    Gio.BusNameWatcherFlags.NONE,
    onNameAppeared,
    onNameVanished
);

// Start an event loop
let loop = GLib.MainLoop.new(null, false);
loop.run();
