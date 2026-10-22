document.addEventListener('DOMContentLoaded', () => {
    const registrationSection = document.getElementById('registration');
    const form = document.getElementById('registration-form');
    const message = document.getElementById('form-message');
    const registerButtons = document.querySelectorAll('.btn-register');
    const trackGoal = (goal, params = {}) => {
        try {
            if (typeof window.ym === 'function') {
                window.ym(113670655, 'reachGoal', goal, params);
            }
        } catch (_) {
            // Analytics must never interrupt registration.
        }
    };

    registerButtons.forEach((button) => {
        button.addEventListener('click', () => {
            trackGoal('registration_cta_click', { placement: button.dataset.cta || 'pricing' });
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
            trackGoal('registration_form_start');
        }
    });

    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
                trackGoal('registration_form_view');
                observer.disconnect();
            }
        }, { threshold: 0.1 });
        observer.observe(form);
    }

    let submitting = false;
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (submitting) {
            return;
        }
        submitting = true;

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

            const data = await response.json();

            if (!response.ok || !data.ok) {
                throw new Error(data.error || 'Не удалось отправить заявку.');
            }

            if (message) {
                message.textContent = 'Заявка успешно отправлена. Мы свяжемся с вами в ближайшее время.';
                message.className = 'form-message success';
            }

            trackGoal('registration_success');
            form.reset();
            formStarted = false;
        } catch (error) {
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
