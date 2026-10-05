import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../../data/db.json');

const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

// Find or normalize Welcome Day event
let welcomeEvent = db.events.find(e => e.name.toLowerCase().includes('welcome'));
if (!welcomeEvent) {
  welcomeEvent = {
    id: 'event-welcome-day',
    name: 'ByteCraft Welcome Day 2026',
    description: 'Annual induction and welcome event for new members and university students.',
    eventType: 'MEETUP',
    date: '2026-10-15',
    startTime: '13:30',
    endTime: '18:00',
    location: 'ESTIN Main Amphitheater',
    responsibleDepartmentId: 'dept-com',
    organizerId: 'user-aya-karou',
    responsibleMemberIds: ['user-aya-karou', 'user-manel-lyazidi', 'user-elmouatez-ledjassa'],
    status: 'UPCOMING',
    expectedParticipants: 150,
    notes: 'Official club kickoff run-of-show',
    attachments: []
  };
  db.events.unshift(welcomeEvent);
} else {
  welcomeEvent.name = 'ByteCraft Welcome Day 2026';
  welcomeEvent.date = '2026-10-15';
  welcomeEvent.startTime = '13:30';
  welcomeEvent.endTime = '18:00';
  welcomeEvent.location = 'ESTIN Main Amphitheater';
}

const eventId = welcomeEvent.id;

const sectionsData = [
  {
    id: 'sec-pre',
    eventId,
    title: '30 minutes before the event',
    order: 1,
    timing: '13:00 - 13:30',
    description: 'Arrival, warm-up and early attendee engagement',
    duration: '30 min',
    responsiblePerson: 'Animation Team',
    items: [
      { id: 'item-pre-1', title: 'Mini games for people arriving early', description: 'Interactive trivia and icebreakers', duration: '15 min', responsiblePerson: 'Animators', order: 1 },
      { id: 'item-pre-2', title: 'Mini games in case of any delays', description: 'Backup crowd engagement games', duration: '15 min', responsiblePerson: 'Animators', order: 2 }
    ]
  },
  {
    id: 'sec-opening',
    eventId,
    title: '1. Opening',
    order: 2,
    timing: '13:30 - 14:00',
    description: 'Welcome and keynote speeches',
    duration: '30 min',
    responsiblePerson: 'Aya Karou and Board',
    items: [
      { id: 'item-op-1', title: 'Animator welcomes everyone', description: 'Introduction to ByteCraft club mission', duration: '5 min', responsiblePerson: 'Lead Animator', order: 1 },
      { id: 'item-op-2', title: "President's speech", description: 'Elmouatez Ledjassa presents club achievements and roadmap', duration: '10 min', responsiblePerson: 'Elmouatez Ledjassa', order: 2 },
      { id: 'item-op-3', title: "Director of the School's speech", description: 'Guest opening remarks by the ESTIN director', duration: '10 min', responsiblePerson: 'School Director', order: 3 },
      { id: 'item-op-4', title: "Vice President's speech", description: 'Overview of student opportunities and values', duration: '5 min', responsiblePerson: 'Vice President', order: 4 }
    ]
  },
  {
    id: 'sec-dept-1',
    eventId,
    title: '2. Departments and Managers - Part 1',
    order: 3,
    timing: '14:00 - 14:30',
    description: 'Presentation of first cohort of departments',
    duration: '30 min',
    responsiblePerson: 'Department Leaders',
    items: [
      { id: 'item-dp-1', title: 'Presentation of the first departments and managers', description: 'Tech and Dev, Design and Multimedia spotlights', duration: '30 min', responsiblePerson: 'Yassine and Imene', order: 1 }
    ]
  },
  {
    id: 'sec-game-1',
    eventId,
    title: '3. Game',
    order: 4,
    timing: '14:30 - 14:50',
    description: 'Audience interactive quiz',
    duration: '20 min',
    responsiblePerson: 'Animation Team',
    items: [
      { id: 'item-gm-1', title: 'First game: ByteCraft Tech Kahoot', description: 'Live coding and tech trivia battle', duration: '20 min', responsiblePerson: 'Animators', order: 1 }
    ]
  },
  {
    id: 'sec-dept-2',
    eventId,
    title: '4. Departments and Managers - Part 2',
    order: 5,
    timing: '14:50 - 15:20',
    description: 'Remaining department presentations',
    duration: '30 min',
    responsiblePerson: 'Department Leaders',
    items: [
      { id: 'item-dp-2', title: 'Presentation of remaining departments and managers', description: 'External Relations, Logistics, and Academic Content', duration: '30 min', responsiblePerson: 'Manel and Rayane', order: 1 }
    ]
  },
  {
    id: 'sec-game-2',
    eventId,
    title: '5. Game',
    order: 6,
    timing: '15:20 - 15:40',
    description: 'Team challenge',
    duration: '20 min',
    responsiblePerson: 'Animation Team',
    items: [
      { id: 'item-gm-2', title: 'Second game: Rapid Problem Solving', description: 'Fast-paced algorithmic riddle challenge', duration: '20 min', responsiblePerson: 'Animators', order: 1 }
    ]
  },
  {
    id: 'sec-winners',
    eventId,
    title: '6. Winners',
    order: 7,
    timing: '15:40 - 15:55',
    description: 'Prize ceremony for online challenge',
    duration: '15 min',
    responsiblePerson: 'Aya Karou',
    items: [
      { id: 'item-win-1', title: 'Announce winners of previously posted game', description: 'Reveal leaderboard from social media puzzle', duration: '7 min', responsiblePerson: 'Aya Karou', order: 1 },
      { id: 'item-win-2', title: 'Give them gifts and ByteCraft swag kits', description: 'Handing out hoodies, stickers, and certificates', duration: '8 min', responsiblePerson: 'Logistics Team', order: 2 }
    ]
  },
  {
    id: 'sec-upcoming',
    eventId,
    title: '7. Upcoming Events',
    order: 8,
    timing: '15:55 - 16:15',
    description: 'Teasers for major upcoming activations',
    duration: '20 min',
    responsiblePerson: 'Project Leads',
    items: [
      { id: 'item-up-1', title: 'Present Find Your Feet', description: 'Mentorship event for freshmen students', duration: '10 min', responsiblePerson: 'Event Lead', order: 1 },
      { id: 'item-up-2', title: 'Present Skillfest Event', description: 'Multi-track skill acquisition bootcamp', duration: '10 min', responsiblePerson: 'Tech Lead', order: 2 }
    ]
  },
  {
    id: 'sec-discord',
    eventId,
    title: '8. Discord',
    order: 9,
    timing: '16:15 - 16:25',
    description: 'Community onboarding',
    duration: '10 min',
    responsiblePerson: 'Community Manager',
    items: [
      { id: 'item-dc-1', title: 'Ask everyone to join ByteCraft Discord server', description: 'Project QR code on screen and guide attendees into channels', duration: '10 min', responsiblePerson: 'Manel Lyazidi', order: 1 }
    ]
  },
  {
    id: 'sec-closing',
    eventId,
    title: '9. Closing',
    order: 10,
    timing: '16:25 - 16:40',
    description: 'Final remarks and gratitude',
    duration: '15 min',
    responsiblePerson: 'Lead Animator',
    items: [
      { id: 'item-cl-1', title: 'Final words from animator', description: 'Recap of the afternoon energy', duration: '7 min', responsiblePerson: 'Lead Animator', order: 1 },
      { id: 'item-cl-2', title: 'Thank everyone and sponsors', description: 'Acknowledgement of administration and organizing crew', duration: '8 min', responsiblePerson: 'Aya Karou', order: 2 }
    ]
  },
  {
    id: 'sec-photo',
    eventId,
    title: '10. Final Picture',
    order: 11,
    timing: '16:40 - 17:00',
    description: 'Club official photo',
    duration: '20 min',
    responsiblePerson: 'Multimedia Team',
    items: [
      { id: 'item-ph-1', title: 'Group picture with all members, managers, board', description: 'Official club portrait and celebration confetti', duration: '20 min', responsiblePerson: 'Mohammed Benkerri', order: 1 }
    ]
  }
];

db.agendaSections = sectionsData.map(s => {
  const { items, ...sec } = s;
  return sec;
});

const flatItems = [];
sectionsData.forEach(s => {
  s.items.forEach(it => {
    flatItems.push({
      ...it,
      eventId,
      sectionId: s.id,
      notes: ''
    });
  });
});
db.agendaItems = flatItems;

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
console.log('Seeded Welcome Day Run-of-Show successfully! Total sections:', db.agendaSections.length, 'Total items:', db.agendaItems.length);
