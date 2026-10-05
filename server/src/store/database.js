import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { CONFIG } from '../config/index.js';

class Database {
  constructor() {
    this.data = {
      users: [],
      departments: [],
      tasks: [],
      responsibilities: [],
      events: [],
      agendaSections: [],
      agendaItems: [],
      communicationPlans: [],
      communicationItems: [],
      meetings: [],
      notifications: [],
      activityLogs: [],
      attachments: [],
      settings: {}
    };
    this.init();
  }

  init() {
    const dir = path.dirname(CONFIG.DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(CONFIG.UPLOADS_DIR)) {
      fs.mkdirSync(CONFIG.UPLOADS_DIR, { recursive: true });
    }

    if (fs.existsSync(CONFIG.DB_FILE)) {
      try {
        const raw = fs.readFileSync(CONFIG.DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        if (!this.data.agendaSections) this.data.agendaSections = [];
      } catch (err) {
        console.error('Error reading database file, re-seeding...', err);
        this.seedDemoData();
      }
    } else {
      this.seedDemoData();
    }
  }

  save() {
    try {
      const tempPath = `${CONFIG.DB_FILE}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempPath, CONFIG.DB_FILE);
    } catch (err) {
      console.error('Failed to persist database:', err);
    }
  }

  // --- QUERY HELPERS ---
  find(collection, filterFn = () => true) {
    return (this.data[collection] || []).filter(filterFn);
  }

  findById(collection, id) {
    return (this.data[collection] || []).find(item => item.id === id);
  }

  findOne(collection, filterFn) {
    return (this.data[collection] || []).find(filterFn);
  }

  insert(collection, item) {
    if (!this.data[collection]) {
      this.data[collection] = [];
    }
    const newItem = {
      id: item.id || crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...item
    };
    this.data[collection].unshift(newItem);
    this.save();
    return newItem;
  }

  update(collection, id, updates) {
    const list = this.data[collection] || [];
    const index = list.findIndex(item => item.id === id);
    if (index === -1) return null;

    list[index] = {
      ...list[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.save();
    return list[index];
  }

  delete(collection, id) {
    const list = this.data[collection] || [];
    const index = list.findIndex(item => item.id === id);
    if (index === -1) return false;
    list.splice(index, 1);
    this.save();
    return true;
  }

  // --- DEMO SEEDING ---
  seedDemoData() {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const getOffsetDate = (offsetDays) => {
      const d = new Date(now);
      d.setDate(d.getDate() + offsetDays);
      return d.toISOString().split('T')[0];
    };

    const passwordHash = bcrypt.hashSync('bytecraft2026', 10);

    // 1. DEPARTMENTS
    const departments = [
      {
        id: 'dept-com',
        name: 'External Relations & Communication Department',
        description: 'PR, external partnerships, communication strategy, and brand promotion.',
        leaderId: 'user-manel-lyazidi',
        color: '#8B5CF6',
        icon: 'Megaphone',
        isArchived: false,
        createdAt: getOffsetDate(-60)
      },
      {
        id: 'dept-design',
        name: 'Design Department',
        description: 'Brand identity, UI/UX design, visual assets, 3D mascots, and graphics.',
        leaderId: 'user-imene-bouzena',
        color: '#EC4899',
        icon: 'Palette',
        isArchived: false,
        createdAt: getOffsetDate(-60)
      },
      {
        id: 'dept-multimedia',
        name: 'Multimedia Department',
        description: 'Video production, photography, camera setup, and post-production editing.',
        leaderId: 'user-mohammed-benkerri',
        color: '#F43F5E',
        icon: 'Video',
        isArchived: false,
        createdAt: getOffsetDate(-60)
      },
      {
        id: 'dept-logistics',
        name: 'Activities & Logistics Department',
        description: 'Venue coordination, hardware setup, equipment, and event scheduling.',
        leaderId: 'user-rayane-alem',
        color: '#10B981',
        icon: 'PackageCheck',
        isArchived: false,
        createdAt: getOffsetDate(-60)
      },
      {
        id: 'dept-dev',
        name: 'Development Department',
        description: 'Web development, mobile engineering, infrastructure, and technical workshops.',
        leaderId: 'user-yassine-bouguerra',
        color: '#00F0FF',
        icon: 'Code2',
        isArchived: false,
        createdAt: getOffsetDate(-60)
      }
    ];

    // 2. USERS (Roles: COORDINATOR, MANAGER)
    const users = [
      {
        id: 'user-aya-karou',
        name: 'Aya Karou',
        email: 'a_karou@estin.dz',
        passwordHash,
        role: 'COORDINATOR',
        departmentId: null,
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        phone: '+213 550 00 00 01',
        joinedDate: getOffsetDate(-180),
        isActive: true
      },
      {
        id: 'user-elmouatez-ledjassa',
        name: 'Elmouatez Ledjassa',
        email: 'e_ledjassa@estin.dz',
        passwordHash,
        role: 'COORDINATOR',
        departmentId: null,
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        phone: '+213 550 00 00 02',
        joinedDate: getOffsetDate(-180),
        isActive: true
      },
      {
        id: 'user-coord',
        name: 'Amine Benali',
        email: 'coordinator@bytecraft.club',
        passwordHash,
        role: 'COORDINATOR',
        departmentId: 'dept-dev',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        phone: '+213 550 12 34 56',
        joinedDate: getOffsetDate(-180),
        isActive: true
      },
      {
        id: 'user-manel-lyazidi',
        name: 'Manel Lyazidi',
        email: 'm_lyazidi@estin.dz',
        passwordHash,
        role: 'MANAGER',
        departmentId: 'dept-com',
        avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
        phone: '0551393898',
        joinedDate: getOffsetDate(-120),
        isActive: true
      },
      {
        id: 'user-imene-bouchareb',
        name: 'Imene Bouchareb',
        email: 'i_bouchareb@estin.dz',
        passwordHash,
        role: 'MANAGER',
        departmentId: 'dept-com',
        avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
        phone: '0554009375',
        joinedDate: getOffsetDate(-115),
        isActive: true
      },
      {
        id: 'user-imene-bouzena',
        name: 'Imene Bouzena',
        email: 'i_bouzena@estin.dz',
        passwordHash,
        role: 'MANAGER',
        departmentId: 'dept-design',
        avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
        phone: '0561 78 35 31',
        joinedDate: getOffsetDate(-110),
        isActive: true
      },
      {
        id: 'user-mohammed-benkerri',
        name: 'Mohammed Benkerri',
        email: 'mbenkerri44@gmail.com',
        passwordHash,
        role: 'MANAGER',
        departmentId: 'dept-multimedia',
        avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
        phone: '0563239114',
        joinedDate: getOffsetDate(-105),
        isActive: true
      },
      {
        id: 'user-lina-zaouani',
        name: 'Lina Zaouani',
        email: 'l_zaouani@estin.dz',
        passwordHash,
        role: 'MANAGER',
        departmentId: 'dept-multimedia',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        phone: '0541038481',
        joinedDate: getOffsetDate(-100),
        isActive: true
      },
      {
        id: 'user-rayane-alem',
        name: 'Rayane Alem',
        email: 'r_alem@estin.dz',
        passwordHash,
        role: 'MANAGER',
        departmentId: 'dept-logistics',
        avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
        phone: '+213563809022',
        joinedDate: getOffsetDate(-95),
        isActive: true
      },
      {
        id: 'user-yassine-bouguerra',
        name: 'Yassine Bouguerra',
        email: 'y_bouguerra@estin.dz',
        passwordHash,
        role: 'MANAGER',
        departmentId: 'dept-dev',
        avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
        phone: '+213 552 34 56 78',
        joinedDate: getOffsetDate(-90),
        isActive: true
      }
    ];

    // 3. RESPONSIBILITIES (Ongoing roles)
    const responsibilities = [
      {
        id: 'resp-1',
        memberId: 'user-manel-lyazidi',
        departmentId: 'dept-com',
        title: 'External Relations & PR Partnerships',
        description: 'Managing partnerships, press releases, and club sponsorships.'
      },
      {
        id: 'resp-2',
        memberId: 'user-imene-bouchareb',
        departmentId: 'dept-com',
        title: 'Social Media Strategy & Publications',
        description: 'Executing communication plans, Instagram releases, and community announcements.'
      },
      {
        id: 'resp-3',
        memberId: 'user-imene-bouzena',
        departmentId: 'dept-design',
        title: 'Brand Visual Identity & Creative Direction',
        description: 'Designing posters, branding assets, event UI, and presentation templates.'
      },
      {
        id: 'resp-4',
        memberId: 'user-mohammed-benkerri',
        departmentId: 'dept-multimedia',
        title: 'Video Teaser & Motion Graphics Direction',
        description: 'Directing video productions, teaser drops, and dynamic animations.'
      },
      {
        id: 'resp-5',
        memberId: 'user-lina-zaouani',
        departmentId: 'dept-multimedia',
        title: 'Event Photography & Post-Production',
        description: 'Live event camera coverage, photo sorting, and social reels.'
      },
      {
        id: 'resp-6',
        memberId: 'user-rayane-alem',
        departmentId: 'dept-logistics',
        title: 'Logistics, Venue & Audio Setup',
        description: 'Equipment reservation, audio mixer testing, and stage readiness.'
      },
      {
        id: 'resp-7',
        memberId: 'user-yassine-bouguerra',
        departmentId: 'dept-dev',
        title: 'Tech Lead & Platform Infrastructure',
        description: 'Managing web platforms, club APIs, registration forms, and deployment pipelines.'
      }
    ];

    // 4. EVENTS
    const events = [
      {
        id: 'event-workshop',
        name: 'ByteCraft Modern Web & AI Workshop',
        description: 'Hands-on 3-hour masterclass exploring full-stack engineering, agentic development, and club onboarding.',
        eventType: 'WORKSHOP',
        date: getOffsetDate(3), // Event in 3 days!
        startTime: '14:00',
        endTime: '17:30',
        location: 'University Tech Amphitheater B',
        organizerId: 'user-coord',
        responsibleDepartmentId: 'dept-dev',
        responsibleMemberIds: ['user-amine-lead', 'user-tarek', 'user-sarah-lead'],
        status: 'ACTIVE',
        expectedParticipants: 120,
        notes: 'Projector HDMI adapter and 2 wireless mics needed. Livestream to Discord stage.',
        attachments: [
          { id: 'att-1', name: 'Workshop_Syllabus_2026.pdf', size: '2.4 MB', type: 'application/pdf', url: '#' },
          { id: 'att-2', name: 'Hall_Layout_Tech_Amphi.png', size: '1.1 MB', type: 'image/png', url: '#' }
        ],
        createdAt: getOffsetDate(-14)
      },
      {
        id: 'event-hackathon',
        name: 'ByteCraft Annual 36H Hackathon',
        description: 'Our flagship university hackathon bringing 40 teams together to solve real-world community challenges.',
        eventType: 'HACKATHON',
        date: getOffsetDate(18),
        startTime: '09:00',
        endTime: '21:00',
        location: 'Main University Innovation Hub & Open Atrium',
        organizerId: 'user-coord',
        responsibleDepartmentId: 'dept-logistics',
        responsibleMemberIds: ['user-yacine-lead', 'user-karim-lead', 'user-sarah-lead', 'user-amine-lead'],
        status: 'PLANNED',
        expectedParticipants: 200,
        notes: 'Sponsor banners arrived. 10Gbps fiber switch requested from university IT.',
        attachments: [
          { id: 'att-3', name: 'Hackathon_Rulebook_2026.pdf', size: '3.8 MB', type: 'application/pdf', url: '#' }
        ],
        createdAt: getOffsetDate(-25)
      },
      {
        id: 'event-meetup',
        name: 'ByteCraft Tech Talk: Future of Cloud & Edge',
        description: 'Evening panel discussion with ByteCraft alumni and guest industry engineers.',
        eventType: 'MEETUP',
        date: getOffsetDate(28),
        startTime: '17:00',
        endTime: '19:30',
        location: 'Cyber Lounge 101',
        organizerId: 'user-meriem-lead',
        responsibleDepartmentId: 'dept-content',
        responsibleMemberIds: ['user-meriem-lead', 'user-nour'],
        status: 'PLANNED',
        expectedParticipants: 60,
        notes: 'Q&A session followed by coffee and networking.',
        attachments: [],
        createdAt: getOffsetDate(-10)
      }
    ];

    // 5. EVENT AGENDA ITEMS (for ByteCraft Workshop)
    const agendaItems = [
      {
        id: 'ag-1',
        eventId: 'event-workshop',
        title: 'Check-in & Badge Distribution',
        description: 'Verify registration QR codes and provide ByteCraft stickers.',
        startTime: '13:30',
        endTime: '14:00',
        responsiblePerson: 'Sarah Khelifi',
        location: 'Hall Entrance',
        order: 1,
        notes: 'Have printed list ready for backup.'
      },
      {
        id: 'ag-2',
        eventId: 'event-workshop',
        title: 'Opening Remarks & ByteCraft Vision',
        description: 'Welcome by the Coordinator and overview of the new academic season.',
        startTime: '14:00',
        endTime: '14:25',
        responsiblePerson: 'Amine Benali',
        location: 'Main Stage',
        order: 2,
        notes: 'Display keynote slide deck on the big screen.'
      },
      {
        id: 'ag-3',
        eventId: 'event-workshop',
        title: 'Technical Session: Building Agentic Web Apps',
        description: 'Live coding session demonstrating modern architecture and real-time APIs.',
        startTime: '14:30',
        endTime: '15:45',
        responsiblePerson: 'Yanis Mahrez & Tarek Cherif',
        location: 'Main Stage',
        order: 3,
        notes: 'Ensure live screen mirroring has high resolution.'
      },
      {
        id: 'ag-4',
        eventId: 'event-workshop',
        title: 'Coffee Break & Interactive Demo Booths',
        description: 'Refreshments, networking, and mini-booths for each department.',
        startTime: '15:45',
        endTime: '16:15',
        responsiblePerson: 'Yacine Belkacem',
        location: 'Atrium',
        order: 4,
        notes: 'Coordinate with cafeteria staff 30 mins prior.'
      },
      {
        id: 'ag-5',
        eventId: 'event-workshop',
        title: 'Hands-on Challenge & Mentorship',
        description: 'Attendees build and test their own reactive microservice with team support.',
        startTime: '16:15',
        endTime: '17:15',
        responsiblePerson: 'Imen Saidi & Meriem Haddad',
        location: 'Lab Room 3 & 4',
        order: 5,
        notes: 'WiFi credentials printed on desks.'
      },
      {
        id: 'ag-6',
        eventId: 'event-workshop',
        title: 'Showcase, Q&A & Next Steps',
        description: 'Student project spotlight, award distribution, and group photo.',
        startTime: '17:15',
        endTime: '17:45',
        responsiblePerson: 'Amine Benali',
        location: 'Main Stage',
        order: 6,
        notes: 'Media team must capture official club photo.'
      }
    ];

    // 6. TASKS (Structured to match deadlines: overdue, due today, tomorrow, this week)
    const tasks = [
      // 2 OVERDUE TASKS
      {
        id: 'task-overdue-1',
        title: 'Design Workshop Hero Poster & Social Banners',
        description: 'Create high-res 4K teaser graphics and story banners matching the official ByteCraft neon palette.',
        departmentId: 'dept-design',
        assignedMemberId: 'user-imene-bouzena',
        createdById: 'user-coord',
        eventId: 'event-workshop',
        priority: 'URGENT',
        status: 'BLOCKED',
        startDate: getOffsetDate(-6),
        deadline: getOffsetDate(-2), // 2 days ago!
        progressPercent: 65,
        notes: 'Awaiting revised copy from Communication department before exporting final PNGs.',
        attachments: [
          { id: 'att-poster-draft', name: 'Workshop_Poster_v2_Draft.png', size: '3.2 MB', type: 'image/png', url: '#' }
        ]
      },
      {
        id: 'task-overdue-2',
        title: 'Reserve Tech Amphitheater Sound & Projection System',
        description: 'Submit administrative reservation stamp to university logistics office and test audio mixer.',
        departmentId: 'dept-logistics',
        assignedMemberId: 'user-rayane-alem',
        createdById: 'user-coord',
        eventId: 'event-workshop',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        startDate: getOffsetDate(-5),
        deadline: getOffsetDate(-1), // 1 day ago!
        progressPercent: 80,
        notes: 'Faculty dean approved request; pending security badge clearance.',
        attachments: []
      },
      // 3 TASKS DUE TODAY
      {
        id: 'task-today-1',
        title: 'Deploy Workshop Registration Form & Live Dashboard',
        description: 'Verify Google Form / Webhook integration, generate QR codes, and stress-test server load.',
        departmentId: 'dept-dev',
        assignedMemberId: 'user-yassine-bouguerra',
        createdById: 'user-coord',
        eventId: 'event-workshop',
        priority: 'URGENT',
        status: 'IN_PROGRESS',
        startDate: getOffsetDate(-3),
        deadline: todayStr, // TODAY!
        progressPercent: 85,
        notes: 'Database schema confirmed. Adding automatic confirmation email trigger.',
        attachments: []
      },
      {
        id: 'task-today-2',
        title: 'Publish Speaker Announcement & Topic Teaser on Instagram',
        description: 'Post the verified speaker slide carousel and launch interactive poll on Instagram stories.',
        departmentId: 'dept-com',
        assignedMemberId: 'user-manel-lyazidi',
        createdById: 'user-coord',
        eventId: 'event-workshop',
        priority: 'HIGH',
        status: 'REVIEW',
        startDate: getOffsetDate(-2),
        deadline: todayStr, // TODAY!
        progressPercent: 90,
        notes: 'Copy reviewed. Scheduled for 18:00 peak engagement time.',
        attachments: []
      },
      {
        id: 'task-today-3',
        title: 'Produce 30s Animated Video Teaser for Socials',
        description: 'Edit motion graphics and club highlights for the workshop launch reel.',
        departmentId: 'dept-multimedia',
        assignedMemberId: 'user-mohammed-benkerri',
        createdById: 'user-coord',
        eventId: 'event-workshop',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        startDate: getOffsetDate(-4),
        deadline: todayStr, // TODAY!
        progressPercent: 75,
        notes: 'Render in 9:16 vertical format for Instagram Reels.',
        attachments: []
      },
      // TASKS DUE TOMORROW / THIS WEEK
      {
        id: 'task-tomorrow-1',
        title: 'Prepare Badge Lanyards, Welcome Folders & Stickers',
        description: 'Count and pack 150 ByteCraft holographic sticker packs and print attendee lanyards.',
        departmentId: 'dept-logistics',
        assignedMemberId: 'user-rayane-alem',
        createdById: 'user-coord',
        eventId: 'event-workshop',
        priority: 'MEDIUM',
        status: 'TODO',
        startDate: getOffsetDate(-1),
        deadline: getOffsetDate(1), // Tomorrow
        progressPercent: 30,
        notes: 'Boxes stored in Club Room 402.',
        attachments: []
      },
      {
        id: 'task-week-1',
        title: 'Send Workshop Logistics Email to Confirmed Attendees',
        description: 'Broadcast email containing arrival time, parking instructions, WiFi guidelines, and prerequisites.',
        departmentId: 'dept-com',
        assignedMemberId: 'user-imene-bouchareb',
        createdById: 'user-coord',
        eventId: 'event-workshop',
        priority: 'MEDIUM',
        status: 'TODO',
        startDate: todayStr,
        deadline: getOffsetDate(2),
        progressPercent: 20,
        notes: 'Draft ready in Mailchimp / Resend dashboard.',
        attachments: []
      },
      {
        id: 'task-week-2',
        title: 'Setup Camera Equipment & Stage Lighting for Recording',
        description: 'Configure 2 Sony 4K mirrorless cameras on tripods and wireless lavalier microphones.',
        departmentId: 'dept-multimedia',
        assignedMemberId: 'user-lina-zaouani',
        createdById: 'user-coord',
        eventId: 'event-workshop',
        priority: 'MEDIUM',
        status: 'TODO',
        startDate: getOffsetDate(1),
        deadline: getOffsetDate(3),
        progressPercent: 0,
        notes: 'Batteries fully charged; SD cards formatted.',
        attachments: []
      },
      // COMPLETED TASKS
      {
        id: 'task-comp-1',
        title: 'Finalize Hackathon Keynote Slides & Brand Assets',
        description: 'Keynote presentation slides, keynote deck, and sponsor branding templates.',
        departmentId: 'dept-design',
        assignedMemberId: 'user-imene-bouzena',
        createdById: 'user-coord',
        eventId: 'event-workshop',
        priority: 'HIGH',
        status: 'COMPLETED',
        startDate: getOffsetDate(-12),
        deadline: getOffsetDate(-6),
        progressPercent: 100,
        notes: 'Approved by board.',
        attachments: []
      },
      {
        id: 'task-comp-2',
        title: 'Confirm Tech Amphitheater Date with Faculty Administration',
        description: 'Official confirmation letter signed by faculty dean.',
        departmentId: 'dept-logistics',
        assignedMemberId: 'user-rayane-alem',
        createdById: 'user-coord',
        eventId: 'event-workshop',
        priority: 'URGENT',
        status: 'COMPLETED',
        startDate: getOffsetDate(-14),
        deadline: getOffsetDate(-7),
        progressPercent: 100,
        notes: 'Official permission stamped and filed.',
        attachments: []
      },
      {
        id: 'task-comp-3',
        title: 'Launch Workshop Pre-registration Teaser',
        description: 'Published countdown reel on Instagram and invited Discord members to save the date.',
        departmentId: 'dept-com',
        assignedMemberId: 'user-manel-lyazidi',
        createdById: 'user-coord',
        eventId: 'event-workshop',
        priority: 'MEDIUM',
        status: 'COMPLETED',
        startDate: getOffsetDate(-10),
        deadline: getOffsetDate(-5),
        progressPercent: 100,
        notes: 'Reached 3,400 impressions in the first 48 hours.',
        attachments: []
      },
      // EXTRA TASKS FOR REAL MANAGERS
      {
        id: 'task-extra-1',
        title: 'Draft Hackathon Sponsorship Pitch Deck',
        description: 'Complete 12-slide PDF showcasing sponsor tiers, club reach, and previous edition metrics.',
        departmentId: 'dept-com',
        assignedMemberId: 'user-manel-lyazidi',
        createdById: 'user-coord',
        eventId: 'event-hackathon',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        startDate: getOffsetDate(-3),
        deadline: getOffsetDate(4),
        progressPercent: 50,
        notes: 'Need updated photo assets from Media team.',
        attachments: []
      },
      {
        id: 'task-extra-2',
        title: 'Coordinate Hackathon Catering & Midnight Snacks',
        description: 'Contact 3 local catering providers for 400 meal boxes and coffee urns.',
        departmentId: 'dept-logistics',
        assignedMemberId: 'user-rayane-alem',
        createdById: 'user-coord',
        eventId: 'event-hackathon',
        priority: 'MEDIUM',
        status: 'TODO',
        startDate: getOffsetDate(-2),
        deadline: getOffsetDate(5),
        progressPercent: 15,
        notes: 'Quotes received from 2 vendors.',
        attachments: []
      },
      {
        id: 'task-extra-3',
        title: 'Implement Hackathon Team Formation Portal',
        description: 'Allow registered participants to find teammates and pitch project ideas online.',
        departmentId: 'dept-dev',
        assignedMemberId: 'user-yassine-bouguerra',
        createdById: 'user-coord',
        eventId: 'event-hackathon',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        startDate: getOffsetDate(-5),
        deadline: getOffsetDate(7),
        progressPercent: 40,
        notes: 'Integrated with Discord webhook.',
        attachments: []
      },
      {
        id: 'task-extra-4',
        title: 'Review Discord Bot Moderation & Verification Hooks',
        description: 'Automate role assignments when new university students join the ByteCraft Discord server.',
        departmentId: 'dept-dev',
        assignedMemberId: 'user-imen',
        createdById: 'user-amine-lead',
        eventId: null,
        priority: 'LOW',
        status: 'IN_PROGRESS',
        startDate: getOffsetDate(-3),
        deadline: getOffsetDate(6),
        progressPercent: 60,
        notes: 'Node.js Discord.js v14 bot deployed on server.',
        attachments: []
      }
    ];

    // 7. COMMUNICATION PLAN & ITEMS (COM PLAN MODULE)
    const communicationPlans = [
      {
        id: 'complan-workshop',
        eventId: 'event-workshop',
        title: 'ByteCraft AI & Web Workshop 2026 Com Plan',
        targetAudience: 'University CS & Engineering students, self-taught coders, tech enthusiasts',
        createdAt: getOffsetDate(-10)
      },
      {
        id: 'complan-hackathon',
        eventId: 'event-hackathon',
        title: 'Annual 36H Hackathon Multi-Channel Campaign',
        targetAudience: 'All engineering faculties, designers, startups, club alumni',
        createdAt: getOffsetDate(-20)
      }
    ];

    const communicationItems = [
      // 4 PENDING COMMUNICATION ACTIONS (matching requirement 53!)
      {
        id: 'com-1',
        communicationPlanId: 'complan-workshop',
        eventId: 'event-workshop',
        phase: 'BEFORE',
        title: 'Speaker Reveal Carousel & Highlights',
        channel: 'INSTAGRAM',
        content: 'Unveiling our guest speakers and live interactive agenda! Swipe right to see the topics.',
        responsiblePersonId: 'user-ahmed',
        publicationDate: todayStr, // Pending today!
        status: 'READY',
        notes: 'Approved by Sarah. Waiting for prime evening posting slot.'
      },
      {
        id: 'com-2',
        communicationPlanId: 'complan-workshop',
        eventId: 'event-workshop',
        phase: 'BEFORE',
        title: 'Registration Closing in 24 Hours Alert',
        channel: 'WHATSAPP',
        content: 'Reminder to all community members: only 15 seats remaining for Thursday\'s workshop. Register now!',
        responsiblePersonId: 'user-sarah-lead',
        publicationDate: getOffsetDate(1), // Pending tomorrow
        status: 'PLANNED',
        notes: 'Send to ByteCraft Official Announcement Community.'
      },
      {
        id: 'com-3',
        communicationPlanId: 'complan-workshop',
        eventId: 'event-workshop',
        phase: 'BEFORE',
        title: 'Prerequisites & Laptop Setup Guide',
        channel: 'DISCORD',
        content: 'Please make sure Node.js >= 20 and VSCode are pre-installed before coming to Amphitheater B.',
        responsiblePersonId: 'user-tarek',
        publicationDate: getOffsetDate(2),
        status: 'PLANNED',
        notes: 'Pin message in #workshop-general channel.'
      },
      {
        id: 'com-4',
        communicationPlanId: 'complan-workshop',
        eventId: 'event-workshop',
        phase: 'DURING',
        title: 'Live Workshop Coverage & Backstage Stories',
        channel: 'INSTAGRAM',
        content: 'Live stories from check-in, keynotes, live coding questions, and coffee break vibes.',
        responsiblePersonId: 'user-ahmed',
        publicationDate: getOffsetDate(3),
        status: 'PLANNED',
        notes: 'Coordinate with Karim for high-res instant snaps.'
      },
      // PUBLISHED ITEMS
      {
        id: 'com-comp-1',
        communicationPlanId: 'complan-workshop',
        eventId: 'event-workshop',
        phase: 'BEFORE',
        title: 'Official Workshop Date & Teaser Launch',
        channel: 'INSTAGRAM',
        content: 'Mark your calendars! ByteCraft returns with our first hands-on technical workshop of the season.',
        responsiblePersonId: 'user-sarah-lead',
        publicationDate: getOffsetDate(-7),
        status: 'PUBLISHED',
        notes: 'Post live and pinned to club profile.'
      },
      {
        id: 'com-comp-2',
        communicationPlanId: 'complan-workshop',
        eventId: 'event-workshop',
        phase: 'BEFORE',
        title: 'Registration Form Opening Announcement',
        channel: 'LINKEDIN',
        content: 'ByteCraft Club is proud to announce registrations are officially open for our upcoming developer workshop.',
        responsiblePersonId: 'user-sarah-lead',
        publicationDate: getOffsetDate(-4),
        status: 'PUBLISHED',
        notes: 'Achieved 45 reposts across university circles.'
      }
    ];

    // 8. MEETINGS WITH ACTION ITEMS (Convertible to tasks!)
    const meetings = [
      {
        id: 'meet-1',
        title: 'Weekly Executive Coordination & Workshop Readiness',
        date: getOffsetDate(-2),
        startTime: '18:00',
        endTime: '19:30',
        location: 'Discord Executive Voice + Club Room 402',
        participantIds: ['user-coord', 'user-sarah-lead', 'user-amine-lead', 'user-karim-lead', 'user-yacine-lead', 'user-meriem-lead'],
        agenda: '1. Review Amphitheater reservation status\n2. Inspect workshop presentation deck\n3. Finalize social media promotion schedule\n4. Allocate volunteer check-in roles',
        notes: 'All department heads present. Logistics confirmed dean approval. Design needs 24h extension for final stage banners.',
        decisions: [
          'Approved budget for 150 holographic stickers and guest refreshments.',
          'Shifted registration deadline to Wednesday midnight to accommodate late engineering exams.',
          'Confirmed live Discord stage stream for remote club members.'
        ],
        actionItems: [
          {
            id: 'act-1',
            title: 'Verify audio mixer and microphone batteries in Amphitheater B',
            departmentId: 'dept-logistics',
            responsibleId: 'user-yacine-lead',
            deadline: getOffsetDate(1),
            taskCreated: true,
            taskId: 'task-overdue-2'
          },
          {
            id: 'act-2',
            title: 'Create and print VIP guest badges',
            departmentId: 'dept-design',
            responsibleId: 'user-lina',
            deadline: getOffsetDate(2),
            taskCreated: false
          }
        ]
      },
      {
        id: 'meet-2',
        title: 'Hackathon 2026 Core Planning Committee',
        date: getOffsetDate(5),
        startTime: '16:00',
        endTime: '17:30',
        location: 'Innovation Hub Room A',
        participantIds: ['user-coord', 'user-amine-lead', 'user-sarah-lead', 'user-yacine-lead'],
        agenda: 'Review sponsor packages, problem tracks, jury nominations, and hardware lab inventory.',
        notes: 'Upcoming meeting agenda prepared.',
        decisions: [],
        actionItems: []
      }
    ];

    // 9. NOTIFICATIONS (Live Notification Center Bell)
    const notifications = [
      {
        id: 'notif-1',
        userId: 'user-coord',
        title: 'Urgent: Overdue Task Alert',
        message: 'Task "Design Workshop Hero Poster" assigned to Lina Ait-Ali is 2 days overdue.',
        type: 'DEADLINE',
        priority: 'URGENT',
        isRead: false,
        linkUrl: '/tasks',
        createdAt: getOffsetDate(0) + 'T08:30:00Z'
      },
      {
        id: 'notif-2',
        userId: 'user-coord',
        title: 'Upcoming Event in 3 Days',
        message: 'ByteCraft Modern Web & AI Workshop takes place in 3 days. Preparation currently at 78%.',
        type: 'EVENT',
        priority: 'WARNING',
        isRead: false,
        linkUrl: '/events/event-workshop',
        createdAt: getOffsetDate(0) + 'T09:15:00Z'
      },
      {
        id: 'notif-3',
        userId: 'user-coord',
        title: 'Team Workload Warning',
        message: 'Ahmed Mansouri and Yacine Belkacem have crossed the threshold of 4+ concurrent high-priority tasks.',
        type: 'TASK',
        priority: 'WARNING',
        isRead: false,
        linkUrl: '/workload',
        createdAt: getOffsetDate(0) + 'T10:00:00Z'
      },
      {
        id: 'notif-4',
        userId: 'user-coord',
        title: 'Communication Action Ready for Review',
        message: 'Sarah Khelifi marked "Speaker Reveal Carousel & Highlights" as READY for publication.',
        type: 'COMMUNICATION',
        priority: 'INFO',
        isRead: true,
        linkUrl: '/communication',
        createdAt: getOffsetDate(-1) + 'T14:20:00Z'
      },
      {
        id: 'notif-5',
        userId: 'user-coord',
        title: 'Task Completed',
        message: 'Sarah Khelifi completed "Launch Workshop Pre-registration Teaser".',
        type: 'TASK',
        priority: 'INFO',
        isRead: true,
        linkUrl: '/tasks',
        createdAt: getOffsetDate(-2) + 'T16:45:00Z'
      }
    ];

    // 10. ACTIVITY LOGS (Chronological audit log)
    const activityLogs = [
      {
        id: 'act-log-1',
        actorId: 'user-sarah-lead',
        actorName: 'Sarah Khelifi',
        action: 'STATUS_UPDATED',
        entityType: 'COMMUNICATION',
        entityId: 'com-1',
        details: 'Changed status of "Speaker Reveal Carousel & Highlights" to READY',
        timestamp: getOffsetDate(0) + 'T10:15:00Z'
      },
      {
        id: 'act-log-2',
        actorId: 'user-tarek',
        actorName: 'Tarek Cherif',
        action: 'PROGRESS_UPDATED',
        entityType: 'TASK',
        entityId: 'task-today-1',
        details: 'Updated progress on "Deploy Workshop Registration Form" to 85%',
        timestamp: getOffsetDate(0) + 'T09:40:00Z'
      },
      {
        id: 'act-log-3',
        actorId: 'user-coord',
        actorName: 'Amine Benali (Coordinator)',
        action: 'TASK_ASSIGNED',
        entityType: 'TASK',
        entityId: 'task-extra-1',
        details: 'Assigned "Draft Hackathon Sponsorship Pitch Deck" to Ahmed Mansouri',
        timestamp: getOffsetDate(-1) + 'T15:20:00Z'
      },
      {
        id: 'act-log-4',
        actorId: 'user-meriem-lead',
        actorName: 'Meriem Haddad',
        action: 'PROGRESS_UPDATED',
        entityType: 'TASK',
        entityId: 'task-today-3',
        details: 'Pushed starter code and set progress to 75%',
        timestamp: getOffsetDate(-1) + 'T14:10:00Z'
      },
      {
        id: 'act-log-5',
        actorId: 'user-sarah-lead',
        actorName: 'Sarah Khelifi',
        action: 'TASK_COMPLETED',
        entityType: 'TASK',
        entityId: 'task-comp-3',
        details: 'Completed "Launch Workshop Pre-registration Teaser"',
        timestamp: getOffsetDate(-2) + 'T17:00:00Z'
      },
      {
        id: 'act-log-6',
        actorId: 'user-coord',
        actorName: 'Amine Benali (Coordinator)',
        action: 'EVENT_CREATED',
        entityType: 'EVENT',
        entityId: 'event-workshop',
        details: 'Created "ByteCraft Modern Web & AI Workshop" scheduled for ' + getOffsetDate(3),
        timestamp: getOffsetDate(-14) + 'T11:00:00Z'
      }
    ];

    // 11. CLUB SETTINGS
    const settings = {
      clubName: 'ByteCraft Club',
      tagline: 'Crafting the Future of Code, Hardware & Digital Innovation',
      academicYear: '2026 - 2027',
      primaryContact: 'contact@bytecraft.club',
      logoUrl: '/bytecraft-logo.png',
      demoMode: true,
      overloadThreshold: 4,
      notificationsEnabled: true
    };

    this.data = {
      users,
      departments,
      tasks,
      responsibilities,
      events,
      agendaItems,
      communicationPlans,
      communicationItems,
      meetings,
      notifications,
      activityLogs,
      attachments: [],
      settings
    };

    this.save();
    console.log('Seeded database with realistic ByteCraft Club demo data.');
  }
}

export const db = new Database();
