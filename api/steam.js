export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const STEAM_API_KEY = process.env.STEAM_API_KEY;
    const STEAM_ID = '76561198081993127';

    try {
        // Fetch owned games (total hours)
        const ownedRes = await fetch(
            `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${STEAM_API_KEY}&steamid=${STEAM_ID}&include_appinfo=true&include_played_free_games=true`
        );
        const ownedData = await ownedRes.json();

        // Fetch recently played (last 2 weeks)
        const recentRes = await fetch(
            `https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v1/?key=${STEAM_API_KEY}&steamid=${STEAM_ID}&count=10`
        );
        const recentData = await recentRes.json();

        const recentAppIds = new Set(
            (recentData.response.games || []).map(g => g.appid)
        );

        const games = (ownedData.response.games || []).map(game => ({
            appid: game.appid,
            name: game.name,
            hours: Math.round(game.playtime_forever / 60 * 10) / 10,
            recentlyPlayed: recentAppIds.has(game.appid)
        }));

        res.status(200).json({ games });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch Steam data' });
    }
}