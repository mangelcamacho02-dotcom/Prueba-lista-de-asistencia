/* ==========================================================================
   CONVIVIO FAMILIAR 2026 - Interactive Script
   Clon de comportamiento de convivio.medicos.cr/site/
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // Add js-enabled class to document element for progressive enhancement styles
    document.documentElement.classList.add('js-enabled');

    // --------------------------------------------------------------------------
    // 1. INTERSECTION OBSERVER FOR STAGGERED REVEALS
    // --------------------------------------------------------------------------
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                if (entry.target.classList.contains('bento-card')) {
                    const cards = Array.from(entry.target.parentElement.children);
                    const index = cards.indexOf(entry.target);
                    entry.target.style.setProperty('--stagger-delay', `${index * 0.15}s`);
                    entry.target.classList.add('bento-card-visible');
                } else {
                    entry.target.classList.add('visible');
                }
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.bento-card').forEach(card => {
        observer.observe(card);
    });

    // --------------------------------------------------------------------------
    // 2. ACTIVE STATES AND MICRO-INTERACTIONS
    // --------------------------------------------------------------------------
    document.querySelectorAll('.btn, button, a').forEach(el => {
        el.addEventListener('mousedown', () => {
            el.style.transform = 'scale(0.96)';
        });
        el.addEventListener('mouseup', () => {
            el.style.transform = '';
        });
        el.addEventListener('mouseleave', () => {
            el.style.transform = '';
        });

        el.addEventListener('touchstart', () => {
            el.style.transform = 'scale(0.96)';
        }, { passive: true });
        el.addEventListener('touchend', () => {
            el.style.transform = '';
        }, { passive: true });
        el.addEventListener('touchcancel', () => {
            el.style.transform = '';
        }, { passive: true });
    });

    // --------------------------------------------------------------------------
    // 3. IMAGE CAROUSEL FOR PAST CONVIVIOS
    // --------------------------------------------------------------------------
    const track = document.querySelector('.carousel-track');
    if (track) {
        const slides = Array.from(track.children);
        const nextButton = document.querySelector('.carousel-button--right');
        const prevButton = document.querySelector('.carousel-button--left');
        const dotsNav = document.querySelector('.carousel-nav');
        const dots = Array.from(dotsNav.children);

        let currentSlideIndex = 0;
        let autoPlayTimer = null;

        const moveToSlide = (targetIndex) => {
            slides[currentSlideIndex].classList.remove('active');
            dots[currentSlideIndex].classList.remove('active');

            slides[targetIndex].classList.add('active');
            dots[targetIndex].classList.add('active');

            currentSlideIndex = targetIndex;
        };

        const handleNext = () => {
            const nextIndex = (currentSlideIndex + 1) % slides.length;
            moveToSlide(nextIndex);
            resetAutoPlay();
        };

        const handlePrev = () => {
            const prevIndex = (currentSlideIndex - 1 + slides.length) % slides.length;
            moveToSlide(prevIndex);
            resetAutoPlay();
        };

        if (nextButton && prevButton) {
            nextButton.addEventListener('click', handleNext);
            prevButton.addEventListener('click', handlePrev);
        }

        if (dotsNav) {
            dotsNav.addEventListener('click', e => {
                const targetDot = e.target.closest('button');
                if (!targetDot) return;

                const targetIndex = dots.indexOf(targetDot);
                moveToSlide(targetIndex);
                resetAutoPlay();
            });
        }

        const startAutoPlay = () => {
            autoPlayTimer = setInterval(() => {
                const nextIndex = (currentSlideIndex + 1) % slides.length;
                moveToSlide(nextIndex);
            }, 5000);
        };

        const resetAutoPlay = () => {
            clearInterval(autoPlayTimer);
            startAutoPlay();
        };

        startAutoPlay();
    }

    // --------------------------------------------------------------------------
    // 4. VIDEO INLINE PLAYER (reemplaza la carátula al hacer clic)
    // --------------------------------------------------------------------------
    const videoWrapper = document.querySelector('.video-link-wrapper');
    if (videoWrapper) {
        const startInlineVideo = () => {
            const cover = videoWrapper.querySelector('.video-cover-assets');
            const playerContainer = videoWrapper.querySelector('.video-player-container');
            const videoUrl = videoWrapper.getAttribute('data-video-url');

            if (playerContainer && cover) {
                cover.style.display = 'none';
                playerContainer.style.display = 'block';
                playerContainer.innerHTML = '';

                if (videoUrl && (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be'))) {
                    let videoId = '';
                    if (videoUrl.includes('youtube.com/watch?v=')) {
                        videoId = videoUrl.split('v=')[1].split('&')[0];
                    } else if (videoUrl.includes('youtu.be/')) {
                        videoId = videoUrl.split('youtu.be/')[1].split('?')[0];
                    } else if (videoUrl.includes('youtube.com/embed/')) {
                        videoId = videoUrl.split('embed/')[1].split('?')[0];
                    }

                    const iframe = document.createElement('iframe');
                    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
                    iframe.title = 'Convivio 2026 Video';
                    iframe.frameBorder = '0';
                    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
                    iframe.allowFullscreen = true;
                    iframe.style.width = '100%';
                    iframe.style.height = '100%';
                    iframe.style.border = 'none';
                    playerContainer.appendChild(iframe);
                } else if (videoUrl && videoUrl.includes('vimeo.com')) {
                    const videoId = videoUrl.split('vimeo.com/')[1].split('?')[0];
                    const iframe = document.createElement('iframe');
                    iframe.src = `https://player.vimeo.com/video/${videoId}?autoplay=1`;
                    iframe.title = 'Convivio 2026 Video';
                    iframe.frameBorder = '0';
                    iframe.allow = 'autoplay; fullscreen; picture-in-picture';
                    iframe.allowFullscreen = true;
                    iframe.style.width = '100%';
                    iframe.style.height = '100%';
                    iframe.style.border = 'none';
                    playerContainer.appendChild(iframe);
                } else if (videoUrl) {
                    const video = document.createElement('video');
                    video.src = videoUrl;
                    video.controls = true;
                    video.autoplay = true;
                    video.playsInline = true;
                    video.style.width = '100%';
                    video.style.height = '100%';
                    video.style.objectFit = 'cover';
                    playerContainer.appendChild(video);
                } else {
                    playerContainer.innerHTML = '<p style="color:#fff; padding:1.5rem; font-size:14px;">Agrega tu video real asignando el atributo data-video-url al .video-link-wrapper (URL de YouTube, Vimeo o archivo .mp4).</p>';
                }

                videoWrapper.removeEventListener('click', startInlineVideo);
                videoWrapper.style.cursor = 'default';
                videoWrapper.style.transform = 'none';
                videoWrapper.style.boxShadow = '0 10px 30px -10px rgba(0, 0, 0, 0.12)';
            }
        };

        videoWrapper.addEventListener('click', startInlineVideo);
        videoWrapper.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                startInlineVideo();
            }
        });
    }
});
