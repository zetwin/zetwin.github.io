// ========================================
// YouTube Video Background Configuration
// ========================================

// Copy this file to the <script> section in index.html
// and update with your settings

const CONFIG = {
    // Your YouTube Playlist ID
    // Get it from: https://www.youtube.com/playlist?list=YOUR_ID_HERE
    YOUTUBE_PLAYLIST_ID: "PLDZjMr0wZw_72PLFoBfVJm9Cad69vyDoB",
    
    // Enable random/shuffle playback
    // true = videos play in random order
    // false = videos play in sequential order
    ENABLE_SHUFFLE: true,
    
    // Optional: Individual video IDs (alternative to playlist)
    // Uncomment and use if you prefer managing videos in code
    /*
    VIDEO_IDS: [
        'YsC9cIdRPs0',
        'IuAeVYSk5Bc',
        'CH1gq4ntW-E',
        'gdDaEddQ_AE',
        'bWdXsPYQExM',
        'VBscF179po4'
    ],
    */
    
    // Player settings
    PLAYER_SETTINGS: {
        autoplay: 1,
        mute: 1,
        controls: 0,
        loop: 1,
        modestbranding: 1
    }
};
