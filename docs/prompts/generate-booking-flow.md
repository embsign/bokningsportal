You are implementing the frontend UI for a booking application.

The UX flow and layout are defined in the wireframes located in:

docs/ux/wireframes/booking-flow/

The wireframes are the source of truth for:
- layout
- components
- navigation between screens
- rules

Do NOT change the flow. Implement it as specified.

---

Goal

Build a modern, clean, and highly readable UI for a booking application.

The interface must be optimized for:

1. Tablet / kiosk screen
   Resolution: 1920x1080
   Landscape orientation
   Large touch targets

2. Mobile devices
   Responsive layout for small screens.

Tablet should be the primary layout.

---

Design style

Use a modern SaaS-style interface inspired by:

- Linear.app
- Stripe dashboard
- Calendly booking flow

Design principles:

- very clear visual hierarchy
- large readable typography
- large touch targets
- minimal clutter
- clear call-to-action buttons
- calm color palette
- subtle shadows and rounded corners

Important:
The UI must be extremely easy to use on a touchscreen tablet.

---

Components

Create reusable UI components for:

- Header
- StepIndicator
- ServiceCard
- ServiceGrid
- Calendar
- TimeslotButton
- BookingSummary
- FooterNavigation

Components must be reusable and cleanly structured.

---

Responsive behaviour

Tablet (1920x1080):
- spacious layout
- service grid with multiple columns
- large touch targets
- minimal scrolling

Mobile:
- single column layout
- stacked components
- easy thumb navigation

---

Data

There is no backend.

Create mock data for:
- services
- availability
- timeslots
- booking summary

Mock data should be stored in a dedicated mock folder and used by the UI.

The UI must behave as if real data exists.

---

Navigation

Implement navigation between the 4 steps defined in the wireframes:

1 Service selection
2 Date selection
3 Time selection
4 Confirmation

Navigation can be handled using simple client-side state.

---

States

Each screen must support the following states:

- loading
- empty
- normal
- error

Use skeleton loaders where appropriate.

---

Code structure

Organize the frontend with clear structure:

/components
/screens
/mocks
/hooks

Keep the code modular and easy to extend later when a backend API is introduced.

---

Output

Implement the full UI with mock data and working navigation between steps.

Focus on clarity, readability and strong UX for tablet usage.