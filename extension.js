const { St, GLib, Clutter } = imports.gi;
const Main = imports.ui.main;
const Mainloop = imports.mainloop;
const ByteArray = imports.byteArray;

let song_info, timeout, container, status_icon, cleaned_status;

// Restart GNOME-Shell
// Alt+F2, restart/r
// {HOME}/.local/share/gnome-shell/extensions

function Update_Song_Info() {

    // Check if Spotify is running
    try {
        var [ok, playerstatus, err, exit] = GLib.spawn_command_line_sync('playerctl -p spotify status');
    } catch (error) {
        song_info.set_text("Error in Plugin!");
        log("error: ", error);
        return true;
    }

    if (playerstatus.length > 0) {

        // Array for metadata strings
        var arr = [];
        
        // Assign status icon
        cleaned_status = ByteArray.toString(playerstatus).trim();
        if (cleaned_status == "Playing") {
            status_icon.set_icon_name("media-playback-start-symbolic");
        }
        else {
            status_icon.set_icon_name("media-playback-pause-symbolic");
        }
                
        try {
            // Get metadata
            var [ok, album,  err, exit] = GLib.spawn_command_line_sync('playerctl -p spotify metadata album');
            var [ok, artist, err, exit] = GLib.spawn_command_line_sync("playerctl -p spotify metadata artist");
            var [ok, title,  err, exit] = GLib.spawn_command_line_sync('playerctl -p spotify metadata title');

            // Strip trailing empty spaces and newlines
            cleaned_album  = ByteArray.toString(album).trim();
            cleaned_artist = ByteArray.toString(artist).trim();
            cleaned_title  = ByteArray.toString(title).trim();

            if (cleaned_artist == ""){ // In case of podcasts
                arr.push(cleaned_album);
            }
            else {
                arr.push(cleaned_artist);
            }
            
            arr.push(cleaned_title);

            song_info.set_text(arr.join('  -  '));

		}
		catch(error) {
			song_info.set_text("Error in Plugin!");
			log("error: ", error);
			return true;
		}
    }

    else {
        song_info.set_text("Offline");
        status_icon.set_icon_name("");
    }

    return true;
}

function init() {

    log("Starting my own extension...")
    
    // spotify_icon = new St.Icon({
    //     style_class: 'system-status-icon',
    //     icon_name: 'spotify-client',
    // });
    
    song_info = new St.Label({
        text: "Extension loading...",
        y_align: Clutter.ActorAlign.CENTER,
    });
    
    status_icon = new St.Icon({
        style_class: 'system-status-icon',
        icon_name: 'process-working',
    });

    container = new St.BoxLayout({
        style_class: 'panel-button',
        reactive: true,
        track_hover: true,
    });
    
    // container.insert_child_at_index(spotify_icon, 0);
    container.insert_child_at_index(status_icon, 0);
    container.insert_child_at_index(song_info, 1);
}

function enable() {
    Main.panel._centerBox.insert_child_at_index(container, 1);
    timeout = Mainloop.timeout_add_seconds(1.0, Update_Song_Info);
}

function disable() {
    Mainloop.source_remove(timeout);
    Main.panel._centerBox.remove_child(container);
}

