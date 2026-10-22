document.addEventListener('DOMContentLoaded', () => {
    const registrationSection = document.getElementById('registration');
    const form = document.getElementById('registration-form');
    const message = document.getElementById('form-message');
    const registerButtons = document.querySelectorAll('.btn-register');
    const version = 'exp02-accordion-program';
    const startedAt = Date.now();
    const seen = new Set();
    let lastPlacement = 'direct';
    const metric = (...args) => {
        try {
            if (typeof window.ym === 'function') window.ym(113670655, ...args);
        } catch (_) {
            // Analytics must never interrupt registration.
        }
    };
    const trackGoal = (goal, params = {}) => {
        try { window.landingTelemetry?.track(goal, params); } catch (_) { /* Optional analytics. */ }
        const details = {
            version,
            elapsed_seconds: Math.round((Date.now() - startedAt) / 1000),
            viewport: window.innerWidth <= 720 ? 'mobile' : 'desktop',
            ...params,
        };
        // params remains available even before matching goals are configured.
        metric('params', { landing_events: { [goal]: details } });
        metric('reachGoal', goal, details);
    };
    const trackOnce = (goal, key = '', params = {}) => {
        const id = `${goal}:${key}`;
        if (seen.has(id)) return;
        seen.add(id);
        trackGoal(goal, params);
    };
    metric('params', { landing_version: version });
    trackOnce('registration_page_view');

    let pricingIndex = 0;
    const placements = new Map();
    registerButtons.forEach((button) => {
        placements.set(button, button.dataset.cta || `pricing_${++pricingIndex}`);
    });

    registerButtons.forEach((button) => {
        button.addEventListener('click', () => {
            lastPlacement = placements.get(button);
            trackGoal('registration_cta_click', { placement: lastPlacement });
            if (!registrationSection) {
                return;
            }

            const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            registrationSection.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'start' });
        });
    });

    if (!form) {
        return;
    }

    let formStarted = false;
    form.addEventListener('input', () => {
        if (!formStarted) {
            formStarted = true;
            trackOnce('registration_form_start', '', { placement: lastPlacement });
        }
    });

    const fieldNames = new Set(['name', 'phone', 'email', 'purpose']);
    form.addEventListener('invalid', (event) => {
        const field = event.target.name;
        if (!fieldNames.has(field)) return;
        const validity = event.target.validity;
        const reason = validity.valueMissing ? 'required' : validity.typeMismatch ? 'format' : 'other';
        trackOnce('registration_validation_error', `${field}:${reason}`, { field, reason });
    }, true);

    if ('IntersectionObserver' in window) {
        const observed = new Map();
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting || entry.intersectionRatio < 0.5) return;
                const info = observed.get(entry.target);
                if (!info) return;
                trackOnce(info.goal, info.key, info.params);
                observer.unobserve(entry.target);
            });
        }, { threshold: 0.5 });
        const observe = (element, goal, key = '', params = {}) => {
            if (!element) return;
            observed.set(element, { goal, key, params });
            observer.observe(element);
        };
        registerButtons.forEach((button) => {
            const placement = placements.get(button);
            observe(button, 'registration_cta_view', placement, { placement });
        });
        // Observe the first field, rather than an entire form taller than a mobile screen.
        observe(form.querySelector('[name="name"]'), 'registration_form_view');
        observe(form.querySelector('button[type="submit"]'), 'registration_submit_view');
    }

    let submitting = false;
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (submitting) {
            return;
        }
        submitting = true;
        trackGoal('registration_submit', { placement: lastPlacement });
        const requestStartedAt = Date.now();
        let failureReason = 'network';

        const submitButton = form.querySelector('button[type="submit"]');
        const formData = new FormData(form);

        if (submitButton instanceof HTMLButtonElement) {
            submitButton.disabled = true;
        }

        if (message) {
            message.textContent = '';
            message.className = 'form-message';
        }

        try {
            const response = await fetch(form.action, {
                method: 'POST',
                body: formData,
            });

            failureReason = 'response';
            const data = await response.json();

            if (!response.ok || !data.ok) {
                failureReason = response.ok ? 'validation' : 'http';
                throw new Error(data.error || 'Не удалось отправить заявку.');
            }

            if (message) {
                message.textContent = 'Заявка успешно отправлена. Мы свяжемся с вами в ближайшее время.';
                message.className = 'form-message success';
            }

            trackGoal('registration_success', {
                placement: lastPlacement,
                request_ms: Date.now() - requestStartedAt,
            });
            form.reset();
            formStarted = false;
        } catch (error) {
            trackGoal('registration_submit_error', {
                reason: failureReason,
                request_ms: Date.now() - requestStartedAt,
            });
            if (message) {
                message.textContent = error instanceof Error ? error.message : 'Не удалось отправить заявку.';
                message.className = 'form-message error';
            }
        } finally {
            submitting = false;
            if (submitButton instanceof HTMLButtonElement) {
                submitButton.disabled = false;
            }
        }
    });
});
