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
        if (document.getElementById('mobile-picker')) return;

        const categories = ['All', 'MMORPG', 'Shooter', 'Sports', 'Survival', 'Rogue-like',
            'Competitive', 'RPG', 'Adventure', 'Social', 'Casual', 'Sandbox',
            'Strategy', 'Steam', 'Multiplayer', 'Fighting', 'Platformer', 'Action'];

        const itemHeight = 40;
        const visibleItems = 3;
        const pickerHeight = itemHeight * visibleItems;

        const picker = document.createElement('div');
        picker.id = 'mobile-picker';
        picker.style.height = pickerHeight + 'px';

        const drum = document.createElement('ul');
        drum.id = 'mobile-picker-drum';

        const padTop = document.createElement('li');
        drum.appendChild(padTop);

        categories.forEach((cat) => {
            const li = document.createElement('li');
            li.textContent = cat;
            li.dataset.tag = cat;
            li.className = 'picker-item';
            drum.appendChild(li);
        });

        const padBottom = document.createElement('li');
        drum.appendChild(padBottom);

        const overlay = document.createElement('div');
        overlay.id = 'mobile-picker-overlay';

        const highlight = document.createElement('div');
        highlight.id = 'mobile-picker-highlight';

        picker.appendChild(drum);
        picker.appendChild(overlay);
        picker.appendChild(highlight);

        const filtersEl = document.getElementById('filters');
        filtersEl.parentNode.insertBefore(picker, filtersEl);
        filtersEl.style.display = 'none';

        let currentIndex = 0;
        let startY = 0;
        let lastY = 0;
        let lastTime = 0;
        let startOffset = 0;
        let offset = 0;
        let isDragging = false;
        let velocity = 0;

        function setOffset(val, animate) {
            offset = val;
            drum.style.transition = animate
                ? 'transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                : 'none';
            drum.style.transform = `translateY(${val}px)`;
        }

        function snapTo(index, animate) {
            currentIndex = Math.max(0, Math.min(index, categories.length - 1));
            const targetOffset = -currentIndex * itemHeight + itemHeight;
            setOffset(targetOffset, animate);

            document.querySelectorAll('.picker-item').forEach((el, i) => {
                el.classList.toggle('active', i === currentIndex);
            });

            if ('vibrate' in navigator) navigator.vibrate(8);
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const buf = ctx.createBuffer(1, ctx.sampleRate * 0.02, ctx.sampleRate);
                const src = ctx.createBufferSource();
                src.buffer = buf;
                src.connect(ctx.destination);
                src.start();
            } catch(e) {}

            currentFilter = categories[currentIndex];
            displayGames(currentFilter, document.getElementById('search-bar').value);
        }

        drum.addEventListener('touchstart', function(e) {
            isDragging = true;
            startY = e.touches[0].clientY;
            lastY = startY;
            lastTime = Date.now();
            startOffset = offset;
            velocity = 0;
            drum.style.transition = 'none';
        }, { passive: true });

        drum.addEventListener('touchmove', function(e) {
            if (!isDragging) return;
            const y = e.touches[0].clientY;
            const now = Date.now();
            velocity = (y - lastY) / (now - lastTime);
            lastY = y;
            lastTime = now;
            const delta = y - startY;
            setOffset(startOffset + delta, false);
        }, { passive: true });

        drum.addEventListener('touchend', function() {
            isDragging = false;
            const momentumDelta = velocity * 80;
            const rawIndex = -(offset + momentumDelta - itemHeight) / itemHeight;
            snapTo(Math.round(rawIndex), true);
        }, { passive: true });

        snapTo(0, false);
    }

    $(window).on('resize', function () {
        if (window.innerWidth <= 768) {
            if (!document.getElementById('mobile-picker')) initMobilePicker();
        } else {
            const p = document.getElementById('mobile-picker');
            if (p) p.remove();
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