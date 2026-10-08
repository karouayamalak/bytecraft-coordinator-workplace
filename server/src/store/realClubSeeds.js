import bcrypt from 'bcryptjs';

export const passwordHash = bcrypt.hashSync('bytecraft2026', 10);

export const realDepartments = [
  {
    id: 'dept-design',
    name: 'Design',
    description: 'Visual branding, UI/UX design, flyers, badges, 3D graphics, and presentation assets.',
    leaderId: 'user-imene-bouzena',
    color: '#EC4899',
    icon: 'Palette',
    isArchived: false,
    createdAt: '2026-08-01'
  },
  {
    id: 'dept-multimedia',
    name: 'Multimedia',
    description: 'Video recording, podcast production, photography, montage, and audio engineering.',
    leaderId: 'user-mohammed-benkerri',
    color: '#F43F5E',
    icon: 'Camera',
    isArchived: false,
    createdAt: '2026-08-01'
  },
  {
    id: 'dept-com',
    name: 'Communication',
    description: 'Social media management, Instagram campaigns, public announcements, and community engagement.',
    leaderId: 'user-manel-lyazidi',
    color: '#8B5CF6',
    icon: 'Megaphone',
    isArchived: false,
    createdAt: '2026-08-01'
  },
  {
    id: 'dept-er',
    name: 'External Relations',
    description: 'PR, partnerships, sponsorships, university administration, and external media relations.',
    leaderId: 'user-tamer-khalfa',
    color: '#F59E0B',
    icon: 'Handshake',
    isArchived: false,
    createdAt: '2026-08-01'
  },
  {
    id: 'dept-dev-tech',
    name: 'Development & Tech',
    description: 'Web & mobile app development, internal platforms, tooling, competitive programming, and AI/Cloud infrastructure.',
    leaderId: 'user-israa-chiheb',
    color: '#0284c7',
    icon: 'Code2',
    isArchived: false,
    createdAt: '2026-08-01'
  },
  {
    id: 'dept-logistics',
    name: 'Logistics & Activities',
    description: 'Event operations, venue booking, hardware setup, catering, on-site activities, and club logistics.',
    leaderId: 'user-rayane-alem',
    color: '#10B981',
    icon: 'PackageCheck',
    isArchived: false,
    createdAt: '2026-08-01'
  }
];

export const realUsers = [
  // --- EXECUTIVE BOARD ---
  {
    id: 'user-aya-karou',
    name: 'Aya Malak Karou',
    email: 'a_karou@estin.dz',
    passwordHash,
    role: 'COORDINATOR',
    position: 'Club Coordinator',
    departmentId: null,
    phone: '0560386794',
    avatarUrl: '/avatars/aya-karou.jpg',
    socialLinks: {
      linkedin: 'https://linkedin.com/in/aya-malak-karou-15a527398',
      github: 'https://github.com/karouayamalak',
      discord: 'aya_karou'
    },
    joinedDate: '2026-08-01',
    isActive: true
  },
  {
    id: 'user-elmouatez-ledjassa',
    name: 'Elmouatez Billah Ledjassa',
    email: 'e_ledjassa@estin.dz',
    passwordHash,
    role: 'PRESIDENT',
    position: 'President',
    departmentId: null,
    phone: '0540226970',
    avatarUrl: '/avatars/elmouatez-ledjassa.jpeg',
    socialLinks: {
      discord: 'elmouatez_ledjassa'
    },
    joinedDate: '2026-08-01',
    isActive: true
  },
  {
    id: 'user-sadjed-louahouah',
    name: 'Sadjed Louahouah',
    email: 's_louahouah@estin.dz',
    passwordHash,
    role: 'VICE_PRESIDENT',
    position: 'Vice President',
    departmentId: null,
    phone: '0540596422',
    avatarUrl: '/avatars/sadjed-louahouah.jpeg',
    socialLinks: {
      github: 'https://github.com/sadjedlou',
      discord: '1297665091386474546'
    },
    joinedDate: '2026-08-01',
    isActive: true
  },
  {
    id: 'user-abderrahim-zine',
    name: 'Abderrahim Zine',
    email: 'a_zine@estin.dz',
    passwordHash,
    role: 'VICE_PRESIDENT',
    position: 'Vice President',
    departmentId: null,
    phone: '0558339334',
    avatarUrl: '/avatars/abderrahim-zine.jpg',
    socialLinks: {
      discord: 'Rx7iiim.png'
    },
    joinedDate: '2026-08-01',
    isActive: true
  },
  {
    id: 'user-djihad-ladjeroud',
    name: 'Djihad Ladjeroud',
    email: 'd_ladjeroud@estin.dz',
    passwordHash,
    role: 'HR',
    position: 'Human Resources',
    departmentId: null,
    phone: '0668238600',
    avatarUrl: '/avatars/djihad-ladjeroud.jpg',
    socialLinks: {
      discord: 'Djihad0535'
    },
    joinedDate: '2026-08-01',
    isActive: true
  },
  {
    id: 'user-mohamed-telkhoukhe',
    name: 'Mohamed Telkhoukhe',
    email: 'm_telkhoukhe@estin.dz',
    passwordHash,
    role: 'HR',
    position: 'Human Resources',
    departmentId: null,
    phone: '0553322168',
    avatarUrl: '/avatars/mohamed-telkhoukhe.jpg',
    socialLinks: {
      discord: 'm0_h4_m3d'
    },
    joinedDate: '2026-08-01',
    isActive: true
  },
  {
    id: 'user-secretary',
    name: 'Ines Ben Ferhat',
    email: 'b_ines@estin.dz',
    passwordHash,
    role: 'SECRETARY',
    position: 'General Secretary',
    departmentId: null,
    phone: '0559864850',
    avatarUrl: '/avatars/secretary-ines.jpeg',
    socialLinks: {
      discord: 'probablyinesbnfh'
    },
    joinedDate: '2026-09-09',
    isActive: true
  },
  {
    id: 'user-coord',
    name: 'Amine Benali',
    email: 'coordinator@bytecraft.club',
    passwordHash,
    role: 'COORDINATOR',
    position: 'Technical Coordinator',
    departmentId: 'dept-dev-tech',
    phone: '+213 550 12 34 56',
    avatarUrl: '/avatars/aya-karou.jpg',
    joinedDate: '2026-08-01',
    isActive: true
  },

  // --- EXTERNAL RELATIONS & COMMUNICATION ---
  {
    id: 'user-manel-lyazidi',
    name: 'Manel Lyazidi',
    email: 'm_lyazidi@estin.dz',
    passwordHash,
    role: 'MANAGER',
    position: 'Communication Manager',
    departmentId: 'dept-com',
    phone: '0551393898',
    avatarUrl: '/avatars/manel-lyazidi.jpg',
    socialLinks: { discord: 'manel258' },
    joinedDate: '2026-08-22',
    isActive: true
  },
  {
    id: 'user-imene-bouchareb',
    name: 'Imene Bouchareb',
    email: 'i_bouchareb@estin.dz',
    passwordHash,
    role: 'MANAGER',
    position: 'Communication Manager',
    departmentId: 'dept-com',
    phone: '0554009375',
    avatarUrl: '/avatars/imene-bouchareb.jpg',
    socialLinks: { discord: 'alive_maybey.n' },
    joinedDate: '2026-08-22',
    isActive: true
  },
  {
    id: 'user-hadjer-regaz',
    name: 'Hadjer Regaz',
    email: 'ah_regaz@estin.dz',
    passwordHash,
    role: 'MANAGER',
    position: 'Communication Manager',
    departmentId: 'dept-com',
    phone: '0773847892',
    avatarUrl: '/avatars/hadjer-regaz.jpg',
    socialLinks: { discord: 'hadjerregaz_14124' },
    joinedDate: '2026-08-22',
    isActive: true
  },
  {
    id: 'user-nourhane-belgacem',
    name: 'Nourhane Belgacem',
    email: 'an_belgacem@estin.dz',
    passwordHash,
    role: 'MANAGER',
    position: 'Communication Manager',
    departmentId: 'dept-com',
    phone: '0553303512',
    avatarUrl: '/avatars/nourhane-belgacem.jpeg',
    socialLinks: { discord: '1422916517925879808' },
    joinedDate: '2026-08-23',
    isActive: true
  },
  {
    id: 'user-tamer-khalfa',
    name: 'Tamer Khalfa',
    email: 't_khalfa@estin.dz',
    passwordHash,
    role: 'MANAGER',
    position: 'External Relations Manager',
    departmentId: 'dept-er',
    phone: '0699009780',
    avatarUrl: '/avatars/tamer-khalfa.jpeg',
    socialLinks: { discord: 'tmr_kh' },
    joinedDate: '2026-08-23',
    isActive: true
  },
  {
    id: 'user-amani-bendjama',
    name: 'Amani Bendjama',
    email: 'am_bendjama@estin.dz',
    passwordHash,
    role: 'MANAGER',
    position: 'External Relations Manager',
    departmentId: 'dept-er',
    phone: '0552699862',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&auto=format&fit=crop&q=85&crop=faces',
    socialLinks: { discord: 'forgetfulmist' },
    joinedDate: '2026-10-01',
    isActive: true
  },

  // --- DESIGN DEPARTMENT ---
  {
    id: 'user-imene-bouzena',
    name: 'Imene Bouzena',
    email: 'i_bouzena@estin.dz',
    passwordHash,
    role: 'MANAGER',
    position: 'Design Manager',
    departmentId: 'dept-design',
    phone: '0561 78 35 31',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=85&crop=faces',
    socialLinks: { discord: 'Imenebouzena' },
    joinedDate: '2026-08-22',
    isActive: true
  },
  {
    id: 'user-ahmed-boucharbat',
    name: 'Ahmed Boucharbat',
    email: 'aa_boucharbat@estin.dz',
    passwordHash,
    role: 'MANAGER',
    position: 'Design Manager',
    departmentId: 'dept-design',
    phone: '0778158674',
    avatarUrl: '/avatars/ahmed-boucharbat.png',
    socialLinks: { discord: 'Its_torvin__20200' },
    joinedDate: '2026-09-06',
    isActive: true
  },
  {
    id: 'user-sonia-khereddine',
    name: 'Sonia Khereddine',
    email: 's_khereddine@estin.dz',
    passwordHash,
    role: 'MANAGER',
    position: 'Design Manager',
    departmentId: 'dept-design',
    phone: '0667873361',
    avatarUrl: '/avatars/sonia-khereddine.jpg',
    socialLinks: { discord: '1295475637359870043' },
    joinedDate: '2026-09-07',
    isActive: true
  },

  // --- MULTIMEDIA DEPARTMENT ---
  {
    id: 'user-mohammed-benkerri',
    name: 'Mohammed Benkerri',
    email: 'mbenkerri44@gmail.com',
    passwordHash,
    role: 'MANAGER',
    position: 'Multimedia Manager',
    departmentId: 'dept-multimedia',
    phone: '0563239114',
    avatarUrl: '/avatars/mohammed-benkerri.jpg',
    socialLinks: { discord: 'mohbnk' },
    joinedDate: '2026-08-22',
    isActive: true
  },
  {
    id: 'user-lina-zaouani',
    name: 'Lina Zaouani',
    email: 'l_zaouani@estin.dz',
    passwordHash,
    role: 'MANAGER',
    position: 'Multimedia Manager',
    departmentId: 'dept-multimedia',
    phone: '0541038481',
    avatarUrl: '/avatars/lina-zaouani.jpeg',
    socialLinks: { discord: 'linazaouani_49706' },
    joinedDate: '2026-08-22',
    isActive: true
  },
  {
    id: 'user-ines-bessam',
    name: 'Ines Malika Bessam',
    email: 'i_bessam@estin.dz',
    passwordHash,
    role: 'MANAGER',
    position: 'Multimedia Manager',
    departmentId: 'dept-multimedia',
    phone: '0770390756',
    avatarUrl: '/avatars/ines-bessam.webp',
    socialLinks: { discord: 'ines_54826' },
    joinedDate: '2026-08-22',
    isActive: true
  },
  {
    id: 'user-iyad-sebti',
    name: 'Iyad Sebti',
    email: 'i_sebti@estin.dz',
    passwordHash,
    role: 'MANAGER',
    position: 'Multimedia Manager',
    departmentId: 'dept-multimedia',
    phone: '0698042720',
    avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600&auto=format&fit=crop&q=85&crop=faces',
    socialLinks: { discord: 'uyadsb' },
    joinedDate: '2026-08-23',
    isActive: true
  },

  // --- ACTIVITIES & LOGISTICS DEPARTMENT ---
  {
    id: 'user-rayane-alem',
    name: 'Rayane Alem',
    email: 'r_alem@estin.dz',
    passwordHash,
    role: 'MANAGER',
    position: 'Activities & Logistics Manager',
    departmentId: 'dept-logistics',
    phone: '+213563809022',
    avatarUrl: '/avatars/rayane-alem.jpg',
    socialLinks: { discord: 'rayane00.0' },
    joinedDate: '2026-08-22',
    isActive: true
  },
  {
    id: 'user-meryem-feghrour',
    name: 'Meryem Feghrour',
    email: 'm_feghour@estin.dz',
    passwordHash,
    role: 'MANAGER',
    position: 'Logistics & Activities Manager',
    departmentId: 'dept-logistics',
    phone: '0556279114',
    avatarUrl: '/avatars/meryem-feghrour.jpg',
    socialLinks: { discord: 'https://discord.gg/SheypEVg' },
    joinedDate: '2026-08-22',
    isActive: true
  },
  {
    id: 'user-yasser-boucherir',
    name: 'Yasser Boucherir',
    email: 'y_boucherir@estin.dz',
    passwordHash,
    role: 'MANAGER',
    position: 'Logistics & Activities Manager',
    departmentId: 'dept-logistics',
    phone: '0557213734',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=85&crop=faces',
    socialLinks: { discord: 'zadiow' },
    joinedDate: '2026-10-01',
    isActive: true
  },

  // --- DEVELOPMENT & TECH DEPARTMENT ---
  {
    id: 'user-israa-chiheb',
    name: 'Israa Chiheb',
    email: 'i_chiheb@estin.dz',
    passwordHash,
    role: 'MANAGER',
    position: 'Development & Tech Manager',
    departmentId: 'dept-dev-tech',
    phone: '0555139182',
    avatarUrl: '/avatars/israa-chiheb.jpeg',
    socialLinks: { discord: 'itsmeisraa' },
    joinedDate: '2026-08-22',
    isActive: true
  },
  {
    id: 'user-ahmed-belmehnouf',
    name: 'Ahmed Belmehnouf',
    email: 'a_belmehnouf@estin.dz',
    passwordHash,
    role: 'MANAGER',
    position: 'Development & Tech Manager',
    departmentId: 'dept-dev-tech',
    phone: '0551750148',
    avatarUrl: '/avatars/ahmed-belmehnouf.jpg',
    socialLinks: { discord: 'poincre01' },
    joinedDate: '2026-08-23',
    isActive: true
  },
  {
    id: 'user-yassine-bouguerra',
    name: 'Yassine Bouguerra',
    email: 'y_bouguerra@estin.dz',
    passwordHash,
    role: 'MANAGER',
    position: 'Development & Tech Manager',
    departmentId: 'dept-dev-tech',
    phone: '0774807887',
    avatarUrl: '/avatars/yassine-bouguerra.jpg',
    socialLinks: { discord: 'dYMRMeux' },
    joinedDate: '2026-08-22',
    isActive: true
  },
  {
    id: 'user-zohir-hakmi',
    name: 'Zohir Hakmi',
    email: 'z_hakmi@estin.dz',
    passwordHash,
    role: 'MANAGER',
    position: 'Development & Tech Manager',
    departmentId: 'dept-dev-tech',
    phone: '0672568581',
    avatarUrl: '/avatars/zohir-hakmi.png',
    socialLinks: {
      github: 'https://github.com/ZX41R',
      discord: '@y_2i9'
    },
    joinedDate: '2026-08-22',
    isActive: true
  },

  // --- STARTUP & INNOVATION DEPARTMENT ---
  {
    id: 'user-chanez-nouioua',
    name: 'Chanez Nouioua',
    email: 'c_nouioua@estin.dz',
    passwordHash,
    role: 'MANAGER',
    position: 'External Relations Manager',
    departmentId: 'dept-er',
    phone: '0540194485',
    avatarUrl: '/avatars/chanez-nouioua.png',
    socialLinks: { discord: 'chanez_nouioua_53801' },
    joinedDate: '2026-08-23',
    isActive: true
  }
];
