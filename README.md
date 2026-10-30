# Homebase

A deliberately terrible account-deletion experience. Satire as a UX critique.

Homebase is an interactive website built for a university UI hackathon themed "Bad UX for Deleting an Account".

The concept turns account deletion into an intentionally frustrating experience: users must chase, drag and delete dashboard elements into a virtual trash bin before navigating a series of increasingly ridiculous obstacles to supposedly delete their account.

The Concept

Many websites make signing up effortless but deliberately complicate account deletion through hidden settings, retention offers and unnecessary steps.

Homebase exaggerates these dark patterns to demonstrate how frustrating poor UX can be.

Key Features
Interactive drag-and-drop: Move dashboard tiles into a virtual trash bin.
Dodging elements: Tiles escape the cursor before allowing themselves to be caught.
Disappearing trash bin: Limited capacity and randomly disappearing bins.
Forced surveys: Justify every deletion through deliberately frustrating forms.
Dark patterns: Retention offers, confirmshaming, misleading buttons and fake progress bars.
Captcha challenges: Complete unnecessary verification steps.
Roulette finale: A randomised wheel determines whether your account is actually deleted.
Demo mode: Press Shift + D to experience a faster version.
Technologies
HTML5 – Structure and semantic markup.
CSS3 – Styling, responsive layouts and animations.
Vanilla JavaScript (ES6+) – Interactions, application logic and timers.
Pointer Events API – Custom drag-and-drop interactions.
Canvas API – Confetti animations.
SVG – Icons and roulette wheel graphics.

No frameworks, external dependencies or backend required.

Running Locally

Clone the repository:

bash
git clone <your-repository-url>
cd homebase


Open index.html in your browser.

Alternatively, run a local server:

bash
python3 -m http.server 8000


Visit http://localhost:8000.

Hackathon

Created for a university UI hackathon hosted by the Google Developer Group (GDG) Club at the University of Birmingham.

The project explored how unconventional design, interaction and humour can be used to critique real-world UX dark patterns.

Project Structure
text
homebase/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── script.js
├── assets/
│   └── favicon.svg
└── README.md

Future Improvements
Add keyboard-accessible drag-and-drop interactions.
Further improve mobile usability.
Expand the collection of satirical UX patterns.

Built with creativity, experimentation and deliberately terrible UX.
