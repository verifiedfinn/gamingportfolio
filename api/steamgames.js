export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    const STEAM_API_KEY = process.env.STEAM_API_KEY;
    const STEAM_ID = '76561198081993127';
    const HOUR_THRESHOLD = 10;

    try {
        const ownedRes = await fetch(
            `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${STEAM_API_KEY}&steamid=${STEAM_ID}&include_appinfo=true&include_played_free_games=true`
        );
        const ownedData = await ownedRes.json();
        const games = ownedData.response.games || [];

        const eligible = games.filter(g => g.playtime_forever >= HOUR_THRESHOLD * 60);

        const results = await Promise.all(eligible.map(async (game) => {
            try {
                const detailRes = await fetch(
                    `https://store.steampowered.com/api/appdetails?appids=${game.appid}`
                );
                const detailData = await detailRes.json();
                const details = detailData[game.appid]?.data;

                return {
                    appid: game.appid,
                    name: game.name,
                    hours: Math.round(game.playtime_forever / 60 * 10) / 10,
                    shortDescription: details?.short_description || '',
                    description: details?.short_description || '',
                    image: `https://cdn.akamai.steamstatic.com/steam/apps/${game.appid}/header.jpg`,
                    link: `https://store.steampowered.com/app/${game.appid}/`
                };
            } catch {
                return {
                    appid: game.appid,
                    name: game.name,
                    hours: Math.round(game.playtime_forever / 60 * 10) / 10,
                    shortDescription: '',
                    description: '',
                    image: `https://cdn.akamai.steamstatic.com/steam/apps/${game.appid}/header.jpg`,
                    link: `https://store.steampowered.com/app/${game.appid}/`
                };
            }
        }));

        res.status(200).json({ games: results });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch Steam games' });
    }
}