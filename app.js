$(document).ready(function () {

    /* =====================================================
       CONFIG
    ===================================================== */

    const API_BASE = 'http://localhost:8080';


    /* =====================================================
       ЕСЛИ УЖЕ ВОШЁЛ — СРАЗУ В АДМИНКУ
    ===================================================== */

    if (localStorage.getItem('token') || sessionStorage.getItem('token')) {
        window.location.replace('/admin/admin.html');
        return;
    }


    /* =====================================================
       REFS
    ===================================================== */

    const $form          = $('#loginForm');
    const $email         = $('#email');
    const $password      = $('#password');
    const $togglePass    = $('#togglePassword');
    const $remember      = $('#rememberMe');
    const $loginBtn      = $('#loginBtn');
    const $alert         = $('#loginAlert');
    const $alertText     = $('#loginAlertText');

    const $groupEmail    = $('#groupEmail');
    const $groupPassword = $('#groupPassword');

    const $emailError    = $('#emailError');
    const $passwordError = $('#passwordError');


    /* =====================================================
       HELPERS
    ===================================================== */

    function showAlert(message, type) {
        $alert
            .removeClass('success')
            .addClass('show');

        if (type === 'success') $alert.addClass('success');

        $alertText.text(message);
    }

    function hideAlert() {
        $alert.removeClass('show success');
        $alertText.text('');
    }

    function showFieldError($group, $errorEl, message) {
        $group.find('.form-control')
            .removeClass('success')
            .addClass('error');

        $errorEl.text(message).addClass('show');
    }

    function clearFieldError($group, $errorEl) {
        $group.find('.form-control')
            .removeClass('error');

        $errorEl.text('').removeClass('show');
    }

    function markFieldSuccess($group) {
        $group.find('.form-control')
            .removeClass('error')
            .addClass('success');
    }

    function setLoading(isLoading) {
        $loginBtn
            .toggleClass('loading', isLoading)
            .prop('disabled', isLoading);

        $email.prop('disabled', isLoading);
        $password.prop('disabled', isLoading);
    }


    /* =====================================================
       VALIDATION
    ===================================================== */

    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    function validateEmail(silent) {
        const value = $email.val().trim();

        if (!value) {
            if (!silent) showFieldError($groupEmail, $emailError, 'E-poçt boş ola bilməz');
            return false;
        }

        if (!EMAIL_RE.test(value)) {
            if (!silent) showFieldError($groupEmail, $emailError, 'E-poçt formatı yanlışdır');
            return false;
        }

        clearFieldError($groupEmail, $emailError);
        markFieldSuccess($groupEmail);
        return true;
    }

    function validatePassword(silent) {
        const value = $password.val();

        if (!value) {
            if (!silent) showFieldError($groupPassword, $passwordError, 'Şifrə boş ola bilməz');
            return false;
        }

        if (value.length < 6) {
            if (!silent) showFieldError($groupPassword, $passwordError, 'Şifrə ən az 6 simvol olmalıdır');
            return false;
        }

        clearFieldError($groupPassword, $passwordError);
        markFieldSuccess($groupPassword);
        return true;
    }


    /* =====================================================
       FOCUS / BLUR — визуальный стиль
    ===================================================== */

    $('.form-input')
        .on('focus', function () {
            $(this).closest('.form-control').addClass('focused');
        })
        .on('blur', function () {
            $(this).closest('.form-control').removeClass('focused');
        });


    /* =====================================================
       EMAIL — живая валидация
    ===================================================== */

    let emailTouched = false;

    $email.on('input', function () {
        if (!emailTouched) return;
        validateEmail(false);
    });

    $email.on('blur', function () {
        emailTouched = true;
        validateEmail(false);
    });


    /* =====================================================
       PASSWORD — живая валидация
    ===================================================== */

    let passwordTouched = false;

    $password.on('input', function () {
        if (!passwordTouched) return;
        validatePassword(false);
    });

    $password.on('blur', function () {
        passwordTouched = true;
        validatePassword(false);
    });


    /* =====================================================
       TOGGLE PASSWORD
    ===================================================== */

    $togglePass.on('click', function () {

        const $btn = $(this);
        const $icon = $btn.find('i');

        const isPassword = $password.attr('type') === 'password';

        if (isPassword) {
            $password.attr('type', 'text');
            $icon.removeClass('fa-eye').addClass('fa-eye-slash');
            $btn.addClass('active').attr('aria-label', 'Şifrəni gizlət');
        } else {
            $password.attr('type', 'password');
            $icon.removeClass('fa-eye-slash').addClass('fa-eye');
            $btn.removeClass('active').attr('aria-label', 'Şifrəni göstər');
        }

        $password.trigger('focus');
    });


    /* =====================================================
       ВОССТАНОВЛЕНИЕ EMAIL (если был сохранён)
    ===================================================== */

    const savedEmail = localStorage.getItem('rememberedEmail');

    if (savedEmail) {
        $email.val(savedEmail);
        $remember.prop('checked', true);
    }


    /* =====================================================
       SUBMIT
    ===================================================== */

    $form.on('submit', function (e) {

        e.preventDefault();

        hideAlert();

        emailTouched = true;
        passwordTouched = true;

        const okEmail = validateEmail(false);
        const okPassword = validatePassword(false);

        if (!okEmail || !okPassword) {
            return;
        }

        const email = $email.val().trim();
        const password = $password.val();
        const remember = $remember.is(':checked');

        setLoading(true);

        $.ajax({
            url: API_BASE + '/api/auth/login',
            method: 'POST',
            contentType: 'application/json',
            dataType: 'json',
            data: JSON.stringify({ email: email, password: password }),

            success: function (response) {
                const token = response && response.token;

                if (!token) {
                    setLoading(false);
                    showAlert('Server cavabı yanlışdır');
                    return;
                }

                if (remember) {
                    localStorage.setItem('token', token);
                    localStorage.setItem('rememberedEmail', email);
                    sessionStorage.removeItem('token');
                } else {
                    sessionStorage.setItem('token', token);
                    localStorage.removeItem('token');
                    localStorage.removeItem('rememberedEmail');
                }

                if (response.user) {
                    localStorage.setItem('user', JSON.stringify(response.user));
                }

                window.location.replace('/admin/admin.html');
            },

            error: function (xhr) {

                setLoading(false);

                if (xhr.status === 401 || xhr.status === 403) {
                    showAlert('E-poçt və ya şifrə yanlışdır');
                    showFieldError($groupEmail, $emailError, 'Yoxlayın');
                    showFieldError($groupPassword, $passwordError, 'Yoxlayın');
                    return;
                }

                if (xhr.status === 400) {
                    showAlert('Məlumatlar düzgün deyil');
                    return;
                }

                if (xhr.status === 0) {
                    showAlert('Server əlçatmazdır. İnternet bağlantısını yoxlayın');
                    return;
                }

                showAlert('Gözlənilməz xəta (' + xhr.status + ')');
            }
        });

    });


    /* =====================================================
       ENTER в любом поле → submit
    ===================================================== */

    $form.on('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            $form.trigger('submit');
        }
    });


    /* =====================================================
       Убираем alert при новом вводе
    ===================================================== */

    $email.add($password).on('input', function () {
        if ($alert.hasClass('show')) hideAlert();
    });

});
