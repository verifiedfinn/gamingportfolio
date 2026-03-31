$(document).ready(function () {
    let gamesData = [];
    let currentFilter = "All";
    let favorites = JSON.parse(localStorage.getItem("favorites")) || [];
    let sessionOrder = JSON.parse(sessionStorage.getItem("gameOrder")) || [];

    $.getJSON("data/gameinfo.json", function (data) {
        gamesData = data.games;

        if (sessionOrder.length === 0) {
            sessionOrder = shuffleArray(gamesData.map((game) => game.Name));
            sessionStorage.setItem("gameOrder", JSON.stringify(sessionOrder));
        }

        gamesData = reorderGamesBySession(gamesData, sessionOrder);

        fetch('https://gamingportfolio-mauve.vercel.app/api/steam')
            .then(res => res.json())
            .then(steamData => {
                const steamMap = {};
                steamData.games.forEach(g => {
                    steamMap[g.name.toLowerCase()] = g;
                });

                gamesData = gamesData.map(game => {
                    const steamGame = steamMap[game.Name.toLowerCase()];
                    if (steamGame) {
                        if (game.Hours === undefined) game.Hours = steamGame.hours;
                        game.RecentlyPlayed = steamGame.recentlyPlayed;
                    }
                    return game;
                });

                return fetch('https://gamingportfolio-mauve.vercel.app/api/steamgames');
            })
            .then(res => res.json())
            .then(steamGames => {
                const existingNames = new Set(gamesData.map(g => g.Name.toLowerCase()));

                const newGames = steamGames.games
                    .filter(g => !existingNames.has(g.name.toLowerCase()))
                    .map(g => {
                        const rawDesc = g.shortDescription || `A game I've put ${g.hours} hours into.`;
                        const shortDesc = rawDesc.length > 80 ? rawDesc.substring(0, 80).trimEnd() + '...' : rawDesc;
                        return {
                            Name: g.name,
                            Tags: ["Steam"],
                            FirstSentence: shortDesc,
                            RemainingDescription: g.description || 'No description available.',
                            Image: g.image,
                            Link: g.link,
                            Hours: g.hours,
                            RecentlyPlayed: false,
                            SteamAutoAdded: true
                        };
                    });

                gamesData = [...gamesData, ...newGames];
                displayGames();
                initMobilePicker();
            })
            .catch(() => {
                displayGames();
                initMobilePicker();
            });

    }).fail(function () {
        console.error("Failed to load JSON data.");
    });

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function reorderGamesBySession(games, order) {
        const orderedGames = [];
        const gameMap = games.reduce((map, game) => {
            map[game.Name] = game;
            return map;
        }, {});

        order.forEach((gameName) => {
            if (gameMap[gameName]) {
                orderedGames.push(gameMap[gameName]);
                delete gameMap[gameName];
            }
        });

        Object.values(gameMap).forEach((game) => {
            orderedGames.push(game);
        });

        return orderedGames;
    }

    function saveGameOrder(games) {
        const gameOrder = games.map((game) => game.Name);
        sessionStorage.setItem("gameOrder", JSON.stringify(gameOrder));
    }

    function displayGames(filter = "All", searchQuery = "", sortDirection = "none") {
        const container = $("#game-container");
        container.empty();

        let gamesToDisplay = [...gamesData];

        if (filter === "Favorites") {
            gamesToDisplay = gamesData.filter((game) => favorites.includes(game.Name));
        } else {
            if (filter !== "All") {
                gamesToDisplay = gamesToDisplay.filter((game) => game.Tags.includes(filter));
            }

            if (searchQuery) {
                gamesToDisplay = gamesToDisplay.filter((game) =>
                    game.Name.toLowerCase().includes(searchQuery.toLowerCase())
                );
            }

            gamesToDisplay = sortGames(gamesToDisplay, sortDirection);
        }

        saveGameOrder(gamesToDisplay);
        gamesToDisplay.forEach((game) => container.append(renderGame(game)));
        attachHandlers();
    }

    function sortGames(games, direction) {
        if (direction === "A-Z") {
            return games.sort((a, b) => a.Name.localeCompare(b.Name));
        }
        if (direction === "Z-A") {
            return games.sort((a, b) => b.Name.localeCompare(a.Name));
        }
        if (direction === "hours") {
            return games.sort((a, b) => (b.Hours || 0) - (a.Hours || 0));
        }
        if (direction === "recent") {
            return games.sort((a, b) => (b.RecentlyPlayed ? 1 : 0) - (a.RecentlyPlayed ? 1 : 0));
        }
        return games;
    }

    function renderGame(game) {
        const isFavorite = favorites.includes(game.Name);
        const favoriteClass = isFavorite ? "favorited" : "";
        const hoursDisplay = game.Hours !== undefined
            ? `<p class="game-hours">⏱ ${game.Hours} hrs logged</p>`
            : '';
        const recentBadge = game.RecentlyPlayed
            ? `<span class="recently-played-badge">Recently Played</span>`
            : '';
        const steamBadge = game.SteamAutoAdded
            ? `<span class="steam-auto-badge"><img src="https://store.steampowered.com/favicon.ico" alt="Steam" class="steam-icon"/> Steam Pull</span>`
            : '';

        return `
            <div class="game_types" data-name="${game.Name}">
                <div class="card-meta">
                    ${recentBadge}
                    ${steamBadge}
                </div>
                <div class="card-top">
                    <h2>${game.Name}</h2>
                    <p class="short-description">${game.FirstSentence}</p>
                    <img src="${game.Image}" alt="${game.Name}" class="game-image" onerror="this.onerror=null;this.src='https://store.steampowered.com/public/shared/images/header/logo_steam.svg?t=962016';">
                    <div class="more-content" style="display: none;">
                        <p>${game.RemainingDescription}</p>
                        ${hoursDisplay}
                    </div>
                </div>
                <div class="card-bottom">
                    <button class="button-link read-more-btn">Read More</button>
                    <button class="favorite-btn ${favoriteClass}">❤️ Favorite</button>
                </div>
            </div>
        `;
    }

function attachHandlers() {
    $(".read-more-btn").off("click").on("click", function (event) {
        event.stopPropagation();
        const moreContent = $(this).closest(".game_types").find(".more-content");
        const parentBox = $(this).closest(".game_types");
        const btn = $(this);

        btn.css("pointer-events", "none");

        if (moreContent.is(":visible")) {
            parentBox.css("overflow", "hidden");
            moreContent.slideUp(300, () => {
                parentBox.css("height", "auto");
                parentBox.css("overflow", "visible");
                btn.css("pointer-events", "");
            });
            btn.text("Read More");
        } else {
            parentBox.css("overflow", "hidden");
            parentBox.css("height", "auto");
            moreContent.slideDown(300, () => {
                parentBox.css("overflow", "visible");
                btn.css("pointer-events", "");
            });
            btn.text("Read Less");
        }
    });

        $(".favorite-btn").off("click").on("click", function () {
            const parentBox = $(this).closest(".game_types");
            const gameName = parentBox.data("name");

            if ($(this).hasClass("favorited")) {
                favorites = favorites.filter((favName) => favName !== gameName);
                $(this).removeClass("favorited");
            } else {
                favorites.push(gameName);
                $(this).addClass("favorited");
            }

            localStorage.setItem("favorites", JSON.stringify(favorites));
        });
    }

    function initMobilePicker() {
        if (window.innerWidth > 768) return;
        if ($('#mobile-picker').length > 0) return;

        const categories = ['All', 'MMORPG', 'Shooter', 'Sports', 'Survival', 'Rogue-like',
            'Competitive', 'RPG', 'Adventure', 'Social', 'Casual', 'Sandbox',
            'Strategy', 'Steam', 'Multiplayer', 'Fighting', 'Platformer', 'Action'];

        const picker = $('<div id="mobile-picker"></div>');
        const drum = $('<div id="mobile-picker-drum"></div>');
        const overlay = $('<div id="mobile-picker-overlay"></div>');

        categories.forEach((cat) => {
            drum.append(`<div class="picker-item" data-tag="${cat}">${cat}</div>`);
        });

        picker.append(overlay).append(drum);
        picker.append('<div class="picker-arrow picker-arrow-up">▲</div>');
        picker.append('<div class="picker-arrow picker-arrow-down">▼</div>');
        $('#filters').hide();
        $('#filters').before(picker);

        const itemHeight = 44;
        let currentIndex = 0;
        let startY = 0;
        let currentY = 0;
        let isDragging = false;

        function snapTo(index) {
            currentIndex = Math.max(0, Math.min(index, categories.length - 1));
            const offset = -currentIndex * itemHeight + (picker.height() / 2) - (itemHeight / 2);
            drum.css('transform', `translateY(${offset}px)`);

            $('.picker-item').removeClass('active');
            $(`.picker-item[data-tag="${categories[currentIndex]}"]`).addClass('active');

            if ('vibrate' in navigator) navigator.vibrate(8);

            currentFilter = categories[currentIndex];
            displayGames(currentFilter, $("#search-bar").val());
        }

        drum.on('touchstart', function (e) {
            isDragging = true;
            startY = e.originalEvent.touches[0].clientY;
            currentY = startY;
            drum.css('transition', 'none');
        });

        drum.on('touchmove', function (e) {
            e.preventDefault();
            if (!isDragging) return;
            const y = e.originalEvent.touches[0].clientY;
            currentY = y;
            const offset = -currentIndex * itemHeight + (picker.height() / 2) - (itemHeight / 2) + (y - startY);
            drum.css('transform', `translateY(${offset}px)`);
        });

        drum.on('touchend', function () {
            isDragging = false;
            drum.css('transition', 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)');
            const delta = currentY - startY;
            const indexDelta = Math.round(-delta / itemHeight);
            snapTo(currentIndex + indexDelta);
        });

        snapTo(0);
    }

    $(window).on('resize', function () {
        if (window.innerWidth <= 768) {
            if ($('#mobile-picker').length === 0) initMobilePicker();
        } else {
            $('#mobile-picker').remove();
            $('#filters').show();
        }
    });

    if ('vibrate' in navigator) {
        $(document).on('click', '#filters .filter-btn', function () {
            navigator.vibrate(10);
        });
    }

    $("#view-favorites").on("click", function () {
        if (currentFilter === "Favorites") {
            currentFilter = "All";
            $(this).text("View Favorites");
        } else {
            currentFilter = "Favorites";
            $(this).text("Back to All Games");
        }
        displayGames(currentFilter, $("#search-bar").val());
    });

    $("#filters").on("click", ".filter-btn", function () {
        $(".filter-btn").removeClass("active");
        $(this).addClass("active");
        currentFilter = $(this).data("tag");
        displayGames(currentFilter, $("#search-bar").val());
    });

    $("#search-bar").on("input", function () {
        displayGames(currentFilter, $(this).val());
    });

    $("#sort-a-z").on("click", function () {
        displayGames(currentFilter, $("#search-bar").val(), "A-Z");
    });

    $("#sort-z-a").on("click", function () {
        displayGames(currentFilter, $("#search-bar").val(), "Z-A");
    });

    $("#sort-hours").on("click", function () {
        displayGames(currentFilter, $("#search-bar").val(), "hours");
    });

    $("#sort-recent").on("click", function () {
        displayGames(currentFilter, $("#search-bar").val(), "recent");
    });
});