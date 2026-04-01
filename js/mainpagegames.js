$(document).ready(function () {
    let gamesData = [];
    let currentFilter = "All";
    let favorites = JSON.parse(localStorage.getItem("favorites")) || [];
    let cardObserverInstance = null;
    let cardListenerAbort = null;

    // Load both JSONs in parallel, merge, then render
    Promise.all([
        $.getJSON("data/gameinfo.json"),
        $.getJSON("data/steamgames.json").catch(() => null)  // graceful fallback if not yet generated
    ]).then(function([gameinfo, steamData]) {
        gamesData = gameinfo.games;

        if (steamData) {
            // Update hours + recently played for existing games
            const hoursMap = steamData.hoursMap || {};
            gamesData = gamesData.map(game => {
                const steam = hoursMap[game.Name.toLowerCase()];
                if (steam) {
                    if (game.Hours === undefined) game.Hours = steam.hours;
                    game.RecentlyPlayed = steam.recentlyPlayed;
                }
                return game;
            });

            // Add Steam-only games not in gameinfo.json
            const existingNames = new Set(gamesData.map(g => g.Name.toLowerCase()));
            const newGames = steamData.games.filter(g => !existingNames.has(g.Name.toLowerCase()));
            gamesData = [...gamesData, ...newGames];
        }

        gamesData = shuffleArray(gamesData);
        displayGames();
        initMobilePicker();
    }).fail(function() {
        console.error("Failed to load game data.");
    });

    function shuffleArray(array) {
        const a = [...array];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    function displayGames(filter = "All", searchQuery = "", sortDirection = "none") {
        const container = $("#game-container");
        container.empty();

        if (cardObserverInstance) {
            cardObserverInstance.disconnect();
            cardObserverInstance = null;
        }
        if (cardListenerAbort) {
            cardListenerAbort.abort();
            cardListenerAbort = null;
        }

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

        gamesToDisplay.forEach((game) => container.append(renderGame(game)));
        attachHandlers();

        const rawContainer = document.getElementById('game-container');
        if (rawContainer && window.innerWidth <= 768) {
            rawContainer.style.scrollSnapType = 'none';
            rawContainer.scrollLeft = 0;
            requestAnimationFrame(() => {
                rawContainer.scrollLeft = 0;
                requestAnimationFrame(() => {
                    rawContainer.style.scrollSnapType = '';
                    initCardObserver();
                });
            });
        } else {
            initCardObserver();
        }
    }

    function sortGames(games, direction) {
        if (direction === "A-Z") return [...games].sort((a, b) => a.Name.localeCompare(b.Name));
        if (direction === "Z-A") return [...games].sort((a, b) => b.Name.localeCompare(a.Name));
        if (direction === "hours") return [...games].sort((a, b) => (b.Hours || 0) - (a.Hours || 0));
        if (direction === "recent") return [...games].sort((a, b) => (b.RecentlyPlayed ? 1 : 0) - (a.RecentlyPlayed ? 1 : 0));
        return games;
    }

    function haptic(ms) {
        try {
            if ('vibrate' in navigator) { navigator.vibrate(ms); return; }
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const buf = ctx.createBuffer(1, ctx.sampleRate * 0.01, ctx.sampleRate);
            const src = ctx.createBufferSource();
            src.buffer = buf;
            src.connect(ctx.destination);
            src.start();
            setTimeout(() => ctx.close(), 100);
        } catch(e) {}
    }

    function renderGame(game) {
        const isFavorite = favorites.includes(game.Name);
        const favoriteClass = isFavorite ? "favorited" : "";
        const hoursDisplay = game.Hours !== undefined
            ? `<p class="game-hours">⏱ ${game.Hours} hrs logged</p>` : '';
        const recentBadge = game.RecentlyPlayed
            ? `<span class="recently-played-badge">Recently Played</span>` : '';
        const steamBadge = game.SteamAutoAdded
            ? `<span class="steam-auto-badge"><img src="https://store.steampowered.com/favicon.ico" alt="Steam" class="steam-icon"/> Steam Pull</span>` : '';

        return `
            <div class="game_types" data-name="${game.Name}">
                <div class="card-meta">
                    ${recentBadge}
                    ${steamBadge}
                </div>
                <div class="card-top">
                    <h2>${game.Name}</h2>
                    <p class="short-description">${game.FirstSentence}</p>
                    <div class="game-image-wrapper">
                        <img src="${game.Image}" alt="${game.Name}" class="game-image" onerror="this.onerror=null;this.src='https://store.steampowered.com/public/shared/images/header/logo_steam.svg?t=962016';">
                    </div>
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
        $(".read-more-btn").off("click touchend").on("touchend click", function (event) {
            event.preventDefault();
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

        $(".favorite-btn").off("click touchend").on("touchend click", function (event) {
            event.preventDefault();
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

    function initCardObserver() {
        if (window.innerWidth > 768) return;
        const container = document.getElementById('game-container');
        if (!container) return;
        const cards = container.querySelectorAll('.game_types');
        if (!cards.length) return;

        const total = cards.length;
        let lastSnapIdx = -1;
        let hasScrolled = false;

        const oldCounter = document.getElementById('card-counter');
        if (oldCounter) oldCounter.remove();
        const counter = document.createElement('div');
        counter.id = 'card-counter';
        container.parentNode.insertBefore(counter, container);

        function updateCounter(idx) {
            counter.innerHTML = `<span>${idx + 1}</span> / ${total}`;
        }
        updateCounter(0);

        function snapHaptic() {
            if ('vibrate' in navigator) { navigator.vibrate([8, 20, 4]); return; }
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const buf = ctx.createBuffer(1, ctx.sampleRate * 0.015, ctx.sampleRate);
                const data = buf.getChannelData(0);
                for (let i = 0; i < data.length; i++) {
                    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
                }
                const src = ctx.createBufferSource();
                const gain = ctx.createGain();
                gain.gain.value = 0.3;
                src.buffer = buf;
                src.connect(gain);
                gain.connect(ctx.destination);
                src.start();
                setTimeout(() => ctx.close(), 200);
            } catch(e) {}
        }

        const observer = new IntersectionObserver((entries) => {
            if (!hasScrolled) return;
            entries.forEach(entry => {
                if (entry.intersectionRatio > 0.6) {
                    const idx = Array.from(cards).indexOf(entry.target);
                    if (idx !== lastSnapIdx) {
                        cards.forEach(c => {
                            c.classList.remove('is-centered', 'snap-flash');
                            c.style.transform = '';
                            const img = c.querySelector('.game-image-wrapper');
                            if (img) img.style.transform = '';
                        });
                        entry.target.classList.add('is-centered');
                        void entry.target.offsetWidth;
                        entry.target.classList.add('snap-flash');
                        lastSnapIdx = idx;
                        updateCounter(idx);
                        snapHaptic();
                    }
                }
            });
        }, {
            root: container,
            threshold: 0.6
        });

        cardObserverInstance = observer;
        const abort = new AbortController();
        cardListenerAbort = abort;
        const sig = { signal: abort.signal };

        cards.forEach(card => observer.observe(card));
        if (cards[0]) {
            cards[0].classList.add('is-centered');
            lastSnapIdx = 0;
        }

        container.addEventListener('scroll', () => { hasScrolled = true; }, { once: true, ...sig });

        let _touchStartX = 0;
        let _touchStartY = 0;
        container.addEventListener('touchstart', function(e) {
            if (e.touches.length === 1) {
                _touchStartX = e.touches[0].clientX;
                _touchStartY = e.touches[0].clientY;
            }
        }, { passive: true, ...sig });

        container.addEventListener('touchmove', function(e) {
            const dx = Math.abs(e.touches[0].clientX - _touchStartX);
            const dy = Math.abs(e.touches[0].clientY - _touchStartY);
            if (dx > dy && dx > 10) e.stopPropagation();
        }, { passive: true, ...sig });

        container.addEventListener('scroll', function() {
            const containerRect = container.getBoundingClientRect();
            const containerCenter = containerRect.left + containerRect.width / 2;
            cards.forEach(card => {
                const cardRect = card.getBoundingClientRect();
                const cardCenter = cardRect.left + cardRect.width / 2;
                const offset = (cardCenter - containerCenter) / containerRect.width;
                const wrapper = card.querySelector('.game-image-wrapper');
                if (card.classList.contains('is-centered')) {
                    card.style.transform = '';
                    if (wrapper) wrapper.style.transform = '';
                    return;
                }
                if (wrapper) {
                    wrapper.style.transform = `translateX(${offset * -20}px)`;
                    wrapper.style.transition = 'transform 0.1s linear';
                }
                const clampedOffset = Math.max(-1, Math.min(1, offset));
                card.style.transform = `scale(0.88) rotateY(${clampedOffset * 6}deg)`;
            });
        }, { passive: true, ...sig });

        const hintKey = 'swipeHintShown';
        if (!sessionStorage.getItem(hintKey) && cards.length > 1) {
            sessionStorage.setItem(hintKey, '1');
            setTimeout(() => {
                container.scrollBy({ left: 60, behavior: 'smooth' });
                setTimeout(() => container.scrollBy({ left: -60, behavior: 'smooth' }), 500);
            }, 900);
        }
    }

    function initMobilePicker() {
        if (window.innerWidth > 768) return;

        function closeModal(callback) {
            const sheet = document.getElementById('picker-sheet');
            const backdrop = document.getElementById('picker-backdrop');
            sheet.classList.add('closing');
            backdrop.classList.add('closing');
            setTimeout(() => {
                document.getElementById('picker-modal').classList.remove('active');
                sheet.classList.remove('closing');
                backdrop.classList.remove('closing');
                if (callback) callback();
            }, 300);
        }

        document.getElementById('mobile-filter-btn').addEventListener('click', function() {
            document.getElementById('picker-modal').classList.add('active');
            haptic(8);
        });
        document.getElementById('picker-backdrop').addEventListener('click', function() { closeModal(); });
        document.getElementById('picker-close').addEventListener('click', function() { closeModal(); });

        let lastHapticTime = 0;
        document.getElementById('picker-list').addEventListener('scroll', function() {
            const now = Date.now();
            if (now - lastHapticTime > 80) { haptic(4); lastHapticTime = now; }
        }, { passive: true });

        let touchStartY = 0;
        document.getElementById('picker-list').addEventListener('touchstart', function(e) {
            touchStartY = e.touches[0].clientY;
        }, { passive: true });

        document.getElementById('picker-list').addEventListener('touchend', function(e) {
            const dy = Math.abs(e.changedTouches[0].clientY - touchStartY);
            if (dy > 10) return;
            const btn = e.target.closest('.picker-option');
            if (!btn) return;
            e.preventDefault();
            const selected = btn.dataset.val;
            currentFilter = selected;
            document.getElementById('mobile-filter-label').textContent = 'Filter: ' + selected;
            document.querySelectorAll('.picker-option').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            haptic(10);
            closeModal(() => displayGames(currentFilter, document.getElementById('search-bar').value));
        }, { passive: false });

        document.getElementById('picker-list').addEventListener('click', function(e) {
            const btn = e.target.closest('.picker-option');
            if (!btn) return;
            const selected = btn.dataset.val;
            currentFilter = selected;
            document.getElementById('mobile-filter-label').textContent = 'Filter: ' + selected;
            document.querySelectorAll('.picker-option').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            haptic(10);
            closeModal(() => displayGames(currentFilter, document.getElementById('search-bar').value));
        });
    }

    $(window).on('resize', function () {
        if (window.innerWidth > 768) $('#filters').show();
        else $('#filters').hide();
    });

    if ('vibrate' in navigator) {
        $(document).on('click', '#filters .filter-btn', function () { navigator.vibrate(10); });
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

    $("#search-bar").on("input", function () { displayGames(currentFilter, $(this).val()); });
    $("#sort-a-z").on("click", function () { displayGames(currentFilter, $("#search-bar").val(), "A-Z"); });
    $("#sort-z-a").on("click", function () { displayGames(currentFilter, $("#search-bar").val(), "Z-A"); });
    $("#sort-hours").on("click", function () { displayGames(currentFilter, $("#search-bar").val(), "hours"); });
    $("#sort-recent").on("click", function () { displayGames(currentFilter, $("#search-bar").val(), "recent"); });
});