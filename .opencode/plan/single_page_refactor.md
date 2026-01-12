# Plan: Single Page Audit Form Overhaul

## 1. Goal
Refactor the audit form from a "Wizard" (stepped) interface to a **Single Page Scroll** interface. This prioritizes speed and efficiency ("power user" flow) while retaining the comprehensive "Poster" design aesthetic (Acronym Cards).

## 2. Layout Strategy
-   **Container:** A centered, max-width container (e.g., `max-w-4xl`) for optimal readability.
-   **Sticky Navigation (Desktop):** A subtle side rail or top bar that highlights the current section (Identity, ALERTS, SAFETY, Outcome) as the user scrolls.
-   **Section Separation:** Clear visual dividers between the main protocols:
    -   **ALERTS (Green Theme)**
    -   **SAFETY (Blue Theme)**
    -   **Outcome (Purple Theme)**

## 3. Component Updates
-   **`AuditForm` (Refactor):**
    -   Remove `useState` for steps.
    -   Render all `AcronymCard` components in a vertical stack.
    -   Add a **"Review & Submit"** panel at the very bottom (or a sticky footer bar that enables when valid).
-   **`AcronymCard` (Enhancement):**
    -   Ensure it looks good in a continuous stack.
    -   Maybe add collapsible capability (optional, default open).

## 4. Field Verification (Re-Check)
Ensure no data points are lost in the simplification.
-   **Identity:** DOB, Gender.
-   **ALERTS:**
    -   **A:** Triage Time, Triage Performed.
    -   **L:** Liaison (Referral) Time, Referred?
    -   **E:** Compassionate Care (Yes/Partial/No).
    -   **R:** Risk Level (Low/Med/High), Observation (Yes/No/Partial) + *Specific Action Checks*.
    -   **T:** (Not in ALERTS, T is in SAFETY... wait, ALERTS is Assess, Liaison, Engage, Risk, Safeguard).
    -   **S:** Safeguarding Check.
-   **SAFETY:**
    -   **S:** Suicide Risk Type.
    -   **A:** Assessment (Clinician Seen), Trigger.
    -   **F:** Future Intent.
    -   **E:** Environment (Social, Alcohol). *User confirmed "Evidence Present (Yes/No)" is sufficient.*
    -   **T:** Team Communication.
    -   **Y:** Your Actions (Discharge Plan).

## 5. Execution Steps
1.  **Edit `src/components/audit-form.tsx`**:
    -   Remove wizard logic (`currentStep`, `nextStep`, etc.).
    -   Implement the Single Page layout.
    -   Integrate the `AcronymCard` components directly.
    -   Ensure the "Sticky Footer" for submission remains but adapts to the single page flow (always visible or only at bottom? "Single page" usually implies scrolling to bottom to submit, but a sticky "Save" is nice).
2.  **Verify:** Check that the "Action Required" alerts for Risk Level still work dynamically within the single page flow.

## 6. Refinement
-   **"Scroll Spy":** If possible, highlight which section is active in the nav.
-   **Animations:** Keep the `MotionDiv` entrance animations but trigger them on scroll (using `whileInView` potentially, or just initial load for simplicity).

I will now proceed with refactoring `audit-form.tsx` to this Single Page specification.
