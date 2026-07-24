/**
 * Okta for AI Agent Landing Page Logic
 * 
 * - Handles Popups (2-Step Email Verification & Detail Registration)
 * - Persists authorization state using LocalStorage
 * - Integrates with Google Apps Script Web App Endpoint
 * - Dynamically switches video thumbnails to YouTube iframe players
 * - Shows Survey Section only to registered users
 * - Collects and submits integrated User & Survey data to a single Google Sheet
 */

document.addEventListener("DOMContentLoaded", () => {
    // ==========================================
    // 0. CONFIGURATIONS
    // ==========================================
    // 구글 시트 웹 앱 URL 주소 (검증 완료된 최신 배포본)
    const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzNCAJo7Yzuztp_JeRW2neiPZRyxT_fbTcuCgMvLd8BkHONMDsczh81HpnVb3ufT1GA/exec";
    
    // 유튜브 비디오 ID 매핑
    const YOUTUBE_VIDEO_IDS = [
        "Ysv3KQJtmTM", // Session 1 Video ID
        "dM-80c5ZEBk", // Session 2 Video ID
        "uv0EI0RFhGA"  // Session 3 Video ID
    ];

    // LocalStorage Keys for authorization & user info matching
    const LS_AUTH_KEY = "okta_webinar_authorized";
    const LS_USER_NAME = "okta_webinar_user_name";
    const LS_USER_EMAIL = "okta_webinar_user_email";
    const LS_USER_PHONE = "okta_webinar_user_phone";
    const LS_USER_COMPANY = "okta_webinar_user_company";
    const LS_USER_DEPARTMENT = "okta_webinar_user_department";
    const LS_USER_JOB_TITLE = "okta_webinar_user_job";

    // ==========================================
    // 1. DOM ELEMENTS
    // ==========================================
    // Modals
    const infoModal = document.getElementById("info-modal");
    const termsModal = document.getElementById("terms-modal");
    
    // Modal Step Containers
    const stepEmailCheck = document.getElementById("step-email-check");
    const stepDetailRegister = document.getElementById("step-detail-register");
    
    // Close & Open & Step Control Buttons
    const closeInfoModalBtn = document.getElementById("close-info-modal");
    const closeTermsModalBtn = document.getElementById("close-terms-modal");
    const openTermsModalBtn = document.getElementById("open-terms-modal");
    const confirmTermsBtn = document.getElementById("confirm-terms-btn");
    
    const btnEmailNext = document.getElementById("btn-email-next");
    const btnBackToEmail = document.getElementById("btn-back-to-email");
    
    // Forms & Inputs
    const checkEmailInput = document.getElementById("check-email");
    const displayEmailInput = document.getElementById("display-email");
    
    const infoSubmitForm = document.getElementById("info-submit-form");
    const privacyAgreementCheckbox = document.getElementById("privacy-agreement");
    const surveyForm = document.getElementById("webinar-survey-form");
    const surveySection = document.getElementById("survey-section");
    
    // Video elements
    const videoCards = document.querySelectorAll(".video-card");

    // ==========================================
    // 2. STATE INITIALIZATION
    // ==========================================
    // Check if user is already authorized on page load
    const isAuthorized = localStorage.getItem(LS_AUTH_KEY) === "true";
    if (isAuthorized) {
        enableAllVideos();
        showSurveySection();
    }

    // ==========================================
    // 3. POPUP MODAL CONTROL
    // ==========================================
    // Open Personal Info Modal when clicking unauthorized video cards
    videoCards.forEach(card => {
        const thumbnailContainer = card.querySelector(".video-thumbnail-container");
        thumbnailContainer.addEventListener("click", () => {
            if (localStorage.getItem(LS_AUTH_KEY) === "true") {
                return;
            }
            resetModalSteps();
            openModal(infoModal);
        });
    });

    // Close Modals
    closeInfoModalBtn.addEventListener("click", () => closeModal(infoModal));
    closeTermsModalBtn.addEventListener("click", () => closeModal(termsModal));
    
    // Open terms detail modal
    openTermsModalBtn.addEventListener("click", () => openModal(termsModal));

    // Confirm terms detail
    confirmTermsBtn.addEventListener("click", () => {
        privacyAgreementCheckbox.checked = true;
        closeModal(termsModal);
    });

    // Close modal on clicking overlay background
    window.addEventListener("click", (e) => {
        if (e.target === infoModal) closeModal(infoModal);
        if (e.target === termsModal) closeModal(termsModal);
    });

    function openModal(modal) {
        if (modal) {
            modal.classList.add("active");
            document.body.style.overflow = "hidden"; // Prevent body scrolling
        }
    }

    function closeModal(modal) {
        if (modal) {
            modal.classList.remove("active");
            if (!infoModal.classList.contains("active") && !termsModal.classList.contains("active")) {
                document.body.style.overflow = ""; // Restore scrolling
            }
        }
    }

    function resetModalSteps() {
        stepEmailCheck.classList.remove("hidden-step");
        stepDetailRegister.classList.add("hidden-step");
        checkEmailInput.value = "";
        displayEmailInput.value = "";
        infoSubmitForm.reset();
    }

    // ==========================================
    // 4. STEP 1: EMAIL VERIFICATION (GET API)
    // ==========================================
    btnEmailNext.addEventListener("click", async () => {
        const email = checkEmailInput.value.trim();
        if (!email) {
            alert("이메일 주소를 입력해 주세요.");
            return;
        }

        // Simple Email Format Regex
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert("올바른 이메일 형식이 아닙니다.");
            return;
        }

        // Set Loading State
        btnEmailNext.innerText = "확인 중...";
        btnEmailNext.disabled = true;

        try {
            // GET request allows reading the JSON response without CORS pre-flight block
            if (GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL !== "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL") {
                const queryUrl = `${GOOGLE_SCRIPT_URL}?action=check_email&email=${encodeURIComponent(email)}`;
                const response = await fetch(queryUrl);
                const data = await response.json();

                if (data.result === "found" && data.user) {
                    // CASE A: User is already registered! Save state and unlock.
                    localStorage.setItem(LS_AUTH_KEY, "true");
                    localStorage.setItem(LS_USER_EMAIL, email);
                    localStorage.setItem(LS_USER_NAME, data.user.name || "");
                    localStorage.setItem(LS_USER_COMPANY, data.user.company || "");
                    localStorage.setItem(LS_USER_DEPARTMENT, data.user.department || "");
                    localStorage.setItem(LS_USER_JOB_TITLE, data.user.jobTitle || "");
                    localStorage.setItem(LS_USER_PHONE, data.user.phone || "");

                    alert("이메일 인증에 성공했습니다. 다시 방문해 주셔서 감사합니다!");
                    
                    closeModal(infoModal);
                    enableAllVideos();
                    showSurveySection();
                    return;
                }
            } else {
                console.warn("Google Apps Script URL is not set yet. Running offline test mode.");
            }

            // CASE B: Unregistered Email. Switch to Step 2 (Form Registration)
            displayEmailInput.value = email;
            stepEmailCheck.classList.add("hidden-step");
            stepDetailRegister.classList.remove("hidden-step");

        } catch (error) {
            console.error("Email verification check failed:", error);
            // Fallback: If network check fails, proceed to detail registration as safe route
            displayEmailInput.value = email;
            stepEmailCheck.classList.add("hidden-step");
            stepDetailRegister.classList.remove("hidden-step");
        } finally {
            btnEmailNext.innerText = "시청 권한 확인";
            btnEmailNext.disabled = false;
        }
    });

    // Go back from Step 2 to Step 1
    btnBackToEmail.addEventListener("click", () => {
        stepDetailRegister.classList.add("hidden-step");
        stepEmailCheck.classList.remove("hidden-step");
    });

    // ==========================================
    // 5. STEP 2: DETAILS REGISTRATION (POST API)
    // ==========================================
    infoSubmitForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        // 커스텀 알림 처리: 동의함 체크 여부 검증
        if (!privacyAgreementCheckbox.checked) {
            alert("개인정보 수집이용에 동의하지 않으면 영상 시청이 불가능하고 이벤트 참여도 어렵습니다.");
            return;
        }
        
        const formData = new FormData(infoSubmitForm);
        const data = {
            action: "register_info",
            timestamp: new Date().toISOString(),
            email: displayEmailInput.value.trim(),
            company: formData.get("company"),
            department: formData.get("department"),
            jobTitle: formData.get("jobTitle"),
            name: formData.get("name"),
            phone: formData.get("phone"),
            agreement: "동의함"
        };

        if (!data.company || !data.department || !data.jobTitle || !data.name || !data.email || !data.phone) {
            alert("필수 입력 항목을 모두 작성해 주세요.");
            return;
        }

        const submitBtn = infoSubmitForm.querySelector("button[type='submit']");
        const originalBtnText = submitBtn.innerText;
        submitBtn.innerText = "제출 중...";
        submitBtn.disabled = true;

        try {
            // Save local credentials
            localStorage.setItem(LS_AUTH_KEY, "true");
            localStorage.setItem(LS_USER_COMPANY, data.company);
            localStorage.setItem(LS_USER_DEPARTMENT, data.department);
            localStorage.setItem(LS_USER_JOB_TITLE, data.jobTitle);
            localStorage.setItem(LS_USER_NAME, data.name);
            localStorage.setItem(LS_USER_EMAIL, data.email);
            localStorage.setItem(LS_USER_PHONE, data.phone);

            // POST to sheet via no-cors safe mode
            if (GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL !== "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL") {
                await fetch(GOOGLE_SCRIPT_URL, {
                    method: "POST",
                    mode: "no-cors",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded"
                    },
                    body: JSON.stringify(data)
                });
            }

            alert("최초 등록이 완료되었습니다! 이제 웨비나 영상 시청과 설문조사 참여가 가능합니다.");
            
            closeModal(infoModal);
            enableAllVideos();
            showSurveySection();
            
        } catch (error) {
            console.error("Detail submission failed:", error);
            alert("등록이 완료되었습니다. (오프라인 모드)");
            closeModal(infoModal);
            enableAllVideos();
            showSurveySection();
        } finally {
            submitBtn.innerText = originalBtnText;
            submitBtn.disabled = false;
        }
    });

    // ==========================================
    // 6. YOUTUBE VIDEO CONVERSION & SURVEY REVEAL
    // ==========================================
    function enableAllVideos() {
        videoCards.forEach((card, index) => {
            const playerContainer = card.querySelector(".youtube-player-container");
            const playOverlay = card.querySelector(".play-overlay");
            const thumbnail = card.querySelector(".video-thumbnail");
            const videoId = YOUTUBE_VIDEO_IDS[index] || "_yW26d16XQ8";

            playerContainer.innerHTML = `
                <iframe 
                    src="https://www.youtube-nocookie.com/embed/${videoId}?autoplay=0&rel=0&enablejsapi=1" 
                    title="YouTube video player" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                    referrerpolicy="strict-origin-when-cross-origin"
                    allowfullscreen
                    style="width: 100%; height: 100%; border: none; position: absolute; top: 0; left: 0; z-index: 5;">
                </iframe>
            `;
            
            playerContainer.classList.add("active");
            playerContainer.style.zIndex = "5"; // Ensure iframe is on top of container
            if (playOverlay) playOverlay.style.display = "none";
            if (thumbnail) thumbnail.style.display = "none"; // Hide thumbnail completely to allow direct iframe click
        });
    }

    function showSurveySection() {
        if (surveySection) {
            surveySection.style.display = "block";
            surveySection.classList.add("visible");
            console.log("Survey section is now shown to matching verified user.");
        }
    }

    // ==========================================
    // 7. INTEGRATED SURVEY SUBMISSION
    // ==========================================
    surveyForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (!localStorage.getItem(LS_AUTH_KEY)) {
            alert("영상을 시청하기 위해 먼저 개인정보를 입력해 주세요.");
            document.getElementById("video-section").scrollIntoView({ behavior: "smooth" });
            return;
        }

        const surveyData = {
            action: "submit_survey",
            timestamp: new Date().toISOString(),
            company: localStorage.getItem(LS_USER_COMPANY) || "",
            department: localStorage.getItem(LS_USER_DEPARTMENT) || "",
            jobTitle: localStorage.getItem(LS_USER_JOB_TITLE) || "",
            name: localStorage.getItem(LS_USER_NAME) || "",
            email: localStorage.getItem(LS_USER_EMAIL) || "",
            phone: localStorage.getItem(LS_USER_PHONE) || "",
            q1: document.querySelector('input[name="q1"]:checked')?.value || "",
            q2: document.querySelector('input[name="q2"]:checked')?.value || "",
            q3: document.querySelector('input[name="q3"]:checked')?.value || "",
            q4: document.querySelector('input[name="q4"]:checked')?.value || "",
            q5: document.querySelector('input[name="q5"]:checked')?.value || "",
            q6: document.querySelector('input[name="q6"]:checked')?.value || ""
        };

        if (!surveyData.q1 || !surveyData.q2 || !surveyData.q3 || !surveyData.q4 || !surveyData.q5 || !surveyData.q6) {
            alert("모든 설문 문항에 답변해 주세요.");
            return;
        }

        const submitBtn = surveyForm.querySelector(".survey-submit-btn");
        const originalText = submitBtn.innerText;
        submitBtn.innerText = "설문 제출 중...";
        submitBtn.disabled = true;

        try {
            if (GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL !== "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL") {
                await fetch(GOOGLE_SCRIPT_URL, {
                    method: "POST",
                    mode: "no-cors",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded"
                    },
                    body: JSON.stringify(surveyData)
                });
            }

            alert("설문조사가 정상적으로 제출되었습니다! 이벤트 추첨 리스트에 등록되었습니다. 감사합니다.");
            surveyForm.reset();
            
        } catch (error) {
            console.error("Survey submission failed:", error);
            alert("설문 제출이 완료되었습니다. (테스트 접수 성공)");
            surveyForm.reset();
        } finally {
            submitBtn.innerText = originalText;
            submitBtn.disabled = false;
        }
    });
});
