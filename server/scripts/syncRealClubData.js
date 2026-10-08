import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { realDepartments, realUsers } from '../src/store/realClubSeeds.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '../data/db.json');

const departments = realDepartments;
const users = realUsers;

// Read existing db.json
let currentData = {};
try {
  currentData = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
} catch (e) {
  console.log('Error reading db.json, creating fresh');
}

currentData.departments = departments;
currentData.users = users;

// Remap old department IDs if present
const mapDeptId = (id) => {
  if (id === 'dept-dev' || id === 'dept-tech' || id === 'dept-startup') return 'dept-dev-tech';
  return id;
};

// Make sure existing tasks link to valid departments & users
if (Array.isArray(currentData.tasks)) {
  currentData.tasks = currentData.tasks.map(t => {
    const deptId = mapDeptId(t.departmentId);
    const userExists = users.some(u => u.id === t.assignedMemberId);
    const assignedId = userExists ? t.assignedMemberId : (departments.find(d => d.id === deptId)?.leaderId || 'user-aya-karou');
    const assignedMemberIds = Array.isArray(t.assignedMemberIds) && t.assignedMemberIds.length > 0 
      ? t.assignedMemberIds.filter(id => users.some(u => u.id === id))
      : [assignedId];
    const departmentIds = Array.isArray(t.departmentIds) && t.departmentIds.length > 0
      ? t.departmentIds.map(mapDeptId)
      : [deptId];

    return {
      ...t,
      departmentId: deptId,
      departmentIds,
      assignedMemberId: assignedId,
      assignedMemberIds
    };
  });
}

if (Array.isArray(currentData.events)) {
  currentData.events = currentData.events.map(e => ({
    ...e,
    responsibleDepartmentId: mapDeptId(e.responsibleDepartmentId)
  }));
}

if (Array.isArray(currentData.responsibilities)) {
  currentData.responsibilities = currentData.responsibilities.map(r => ({
    ...r,
    departmentId: mapDeptId(r.departmentId)
  }));
}

// Write back to db.json
fs.writeFileSync(dbPath, JSON.stringify(currentData, null, 2), 'utf-8');
console.log(`Successfully synced ${departments.length} real departments and ${users.length} real team members!`);
