import React, { useMemo, useState, useEffect } from 'react';
import {
  Plus,
  Home,
  Heart,
  Briefcase,
  Church,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  Settings,
  Trash2,
  Users,
  Link as LinkIcon,
  Copy,
} from 'lucide-react';

const API_URL = 'https://family-backend-w852.onrender.com/api/planner';
const API_BASE_URL = 'https://family-backend-w852.onrender.com';

function getInitialFamilyId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('family') || 'family_anders';
}

function getDisplayFamilyName(familyId) {
  const raw = familyId.replace('family_', '').replace(/[_-]+/g, ' ').trim();
  if (!raw) return 'Min familj';
  return raw
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getProfileStorageKey(familyId) {
  return `active_profile:${familyId}`;
}

function getMemberBadge(memberName) {
  const parts = memberName.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function getMemberName(members, memberId) {
  return members.find((member) => member.id === memberId)?.name || 'Okänd';
}

function buildIcsUrl(familyId) {
  return `${API_BASE_URL}/api/planner.ics?family_id=${encodeURIComponent(familyId)}`;
}

const palette = {
  bg: '#efefea',
  page: '#f5f5f0',
  border: '#e5e5e0',
  text: '#1a1a1a',
  white: '#ffffff',
  biz: '#378ADD',
  pastor: '#7F77DD',
  family: '#1D9E75',
  soft: '#f0f0eb',
  subtext: '#888',
};

const initialMembers = [
  { id: 'm1', name: 'Anders' },
  { id: 'm2', name: 'Johanna' },
];

const initialTabs = [
  { id: 'biz', label: 'Företaget', color: palette.biz, icon: 'briefcase', locked: false, ownerId: 'm1', isShared: false, sharedWith: [] },
  { id: 'pastor', label: 'Pastor', color: palette.pastor, icon: 'church', locked: false, ownerId: 'm1', isShared: false, sharedWith: [] },
  { id: 'family', label: 'Familj', color: palette.family, icon: 'home', locked: false, ownerId: 'm1', isShared: true, sharedWith: ['m2'] },
  { id: 'prayer', label: 'Bön', color: palette.pastor, icon: 'heart', locked: true, ownerId: 'm1', isShared: true, sharedWith: ['m2'] },
];

const initialTasks = [
  { id: '1', title: 'Skicka faktura', status: 'todo', area: 'biz', due: '2026-04-18', dueTime: '09:00', note: 'Följ upp med kvitto.' },
  { id: '2', title: 'Förbered predikan', status: 'doing', area: 'pastor', due: '2026-04-20', dueTime: '13:30', note: 'Joh 15 och bön i slutet.' },
  { id: '3', title: 'Handla middag', status: 'todo', area: 'family', due: '2026-04-16', dueTime: '16:00', note: 'Mjölk, pasta och frukt.' },
  { id: '4', title: 'Ring familjen Svensson', status: 'done', area: 'pastor', due: '2026-04-12', dueTime: '10:15', note: '' },
];

const initialPrayers = [
  { id: 'p1', title: 'Be om lugn i familjen', answered: false },
  { id: 'p2', title: 'Be för söndagens gudstjänst', answered: true },
];

const columnLabels = {
  todo: 'Att göra',
  doing: 'Pågående',
  done: 'Klar',
};

const monthNames = ['Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni', 'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December'];
const weekdayNames = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];
const tabColors = [palette.biz, palette.pastor, palette.family, '#EF9F27', '#D4537E', '#888780'];

function getTabIcon(iconName) {
  if (iconName === 'home') return Home;
  if (iconName === 'heart') return Heart;
  if (iconName === 'church') return Church;
  return Briefcase;
}

function formatShortDate(dateString) {
  if (!dateString) return '';
  const date = new Date(`${dateString}T12:00:00`);
  return date.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
}

function formatTime(timeString) {
  if (!timeString) return '';
  return timeString.slice(0, 5);
}

function getTaskDateTime(task) {
  if (!task.due || !task.dueTime) return null;
  return new Date(`${task.due}T${task.dueTime}:00`);
}

function getReminderLabel(reminderMinutes) {
  if (!reminderMinutes && reminderMinutes !== 0) return 'Ingen påminnelse';
  if (reminderMinutes === 0) return 'Vid starttid';
  if (reminderMinutes < 60) return `${reminderMinutes} min före`;
  const hours = reminderMinutes / 60;
  if (Number.isInteger(hours)) return `${hours} tim före`;
  return `${reminderMinutes} min före`;
}

function formatLongDate(dateString) {
  if (!dateString) return '';
  const date = new Date(`${dateString}T12:00:00`);
  return date.toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' });
}

function SmallCalendar({ tasks, selectedDate, onSelectDate }) {
  const today = new Date('2026-04-14T12:00:00');
  const initialOffset = selectedDate
    ? (Number(selectedDate.slice(0, 4)) - today.getFullYear()) * 12 + (Number(selectedDate.slice(5, 7)) - 1 - today.getMonth())
    : 0;
  const [monthOffset, setMonthOffset] = useState(initialOffset);
  const viewDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const firstWeekday = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const eventDays = new Set(
    tasks
      .filter((task) => task.due && task.due.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`))
      .map((task) => Number(task.due.slice(8, 10)))
  );

  const cells = [];
  for (let i = 0; i < firstWeekday; i += 1) cells.push({ day: prevMonthDays - firstWeekday + i + 1, currentMonth: false });
  for (let d = 1; d <= daysInMonth; d += 1) cells.push({ day: d, currentMonth: true });
  while (cells.length % 7 !== 0) cells.push({ day: cells.length - (firstWeekday + daysInMonth) + 1, currentMonth: false });

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button type="button" className="rounded-md p-1.5 hover:bg-stone-100" style={{ color: palette.subtext }} onClick={() => setMonthOffset((v) => v - 1)}>
          <ChevronLeft size={16} />
        </button>
        <div className="text-sm font-semibold">{monthNames[month]} {year}</div>
        <button type="button" className="rounded-md p-1.5 hover:bg-stone-100" style={{ color: palette.subtext }} onClick={() => setMonthOffset((v) => v + 1)}>
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[9px]" style={{ color: '#bbb' }}>
        {weekdayNames.map((name) => <div key={name} className="py-1">{name}</div>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1 text-center text-[11px]">
        {cells.map((cell, index) => {
          const cellDate = cell.currentMonth ? `${year}-${String(month + 1).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}` : null;
          const isToday = monthOffset === 0 && cell.currentMonth && cell.day === today.getDate();
          const isSelected = cell.currentMonth && cellDate === selectedDate;
          const hasEvent = cell.currentMonth && eventDays.has(cell.day);
          return (
            <button
              key={`${cell.day}-${index}`}
              type="button"
              onClick={() => cell.currentMonth && onSelectDate(cellDate)}
              className="relative mx-auto flex h-7 w-7 items-center justify-center rounded-full transition hover:bg-stone-100"
              style={{
                background: isSelected ? '#dfe9f7' : isToday ? palette.text : 'transparent',
                color: isToday ? '#fff' : cell.currentMonth ? '#666' : '#c8c8c2',
                outline: isSelected ? `1px solid ${palette.biz}` : 'none',
              }}
            >
              {cell.day}
              {hasEvent && !isToday ? <span className="absolute bottom-[2px] h-1 w-1 rounded-full" style={{ background: palette.biz }} /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SidebarSection({ title, children }) {
  return (
    <div>
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: '#aaa' }}>{title}</div>
      {children}
    </div>
  );
}

export default function App() {
  const [familyId, setFamilyId] = useState(getInitialFamilyId());
  const apiUrlWithFamily = `${API_URL}?family_id=${encodeURIComponent(familyId)}`;
  const calendarUrl = buildIcsUrl(familyId);

  const [members, setMembers] = useState(initialMembers);
  const [tabs, setTabs] = useState(initialTabs);
  const [currentTab, setCurrentTab] = useState('biz');
  const [tasks, setTasks] = useState(initialTasks);
  const [prayers, setPrayers] = useState(initialPrayers);
  const [selectedDate, setSelectedDate] = useState('2026-04-14');
  const [activeMemberId, setActiveMemberId] = useState('m1');

  const [showModal, setShowModal] = useState(false);
  const [newItem, setNewItem] = useState('');
  const [newItemTime, setNewItemTime] = useState('');
  const [editTaskId, setEditTaskId] = useState(null);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editTaskDue, setEditTaskDue] = useState('');
  const [editTaskTime, setEditTaskTime] = useState('');
  const [editTaskNote, setEditTaskNote] = useState('');
  const [newItemReminderMinutes, setNewItemReminderMinutes] = useState('');
const [editTaskReminderMinutes, setEditTaskReminderMinutes] = useState('');
const [notificationPermission, setNotificationPermission] = useState(
  typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
);
  const [draggingTaskId, setDraggingTaskId] = useState(null);
  const [dragOverStatus, setDragOverStatus] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showCalendarInfo, setShowCalendarInfo] = useState(false);
  const [newTabName, setNewTabName] = useState('');
  const [newTabColor, setNewTabColor] = useState(tabColors[0]);
  const [newMemberName, setNewMemberName] = useState('');
  const [newFamilyName, setNewFamilyName] = useState('');

  const [backendStatus, setBackendStatus] = useState('Ansluter till backend...');
  const [hasLoadedFromBackend, setHasLoadedFromBackend] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('family', familyId);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }, [familyId]);

  useEffect(() => {
    const storedProfile = localStorage.getItem(getProfileStorageKey(familyId));
    setActiveMemberId(storedProfile || 'm1');
  }, [familyId]);

  useEffect(() => {
    if (!activeMemberId) return;
    localStorage.setItem(getProfileStorageKey(familyId), activeMemberId);
  }, [familyId, activeMemberId]);

  useEffect(() => {
    if (members.length === 0) return;
    const memberExists = members.some((member) => member.id === activeMemberId);
    if (!memberExists) {
      setActiveMemberId(members[0]?.id || 'm1');
    }
  }, [members, activeMemberId]);

  useEffect(() => {
    async function fetchPlanner() {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      try {
        const response = await fetch(apiUrlWithFamily, {
          method: 'GET',
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Backend svarade med ${response.status}`);
        }

        const data = await response.json();

        if (data.members) setMembers(data.members);
        if (data.tabs) setTabs(data.tabs);
        if (data.tasks) setTasks(data.tasks);
        if (data.prayers) setPrayers(data.prayers);
        if (data.currentTab) setCurrentTab(data.currentTab);
        if (data.selectedDate) setSelectedDate(data.selectedDate);

        setBackendStatus(`Synkad med backend · ${familyId}`);
      } catch (error) {
        console.error('Kunde inte hämta data från backend:', error);
        setBackendStatus(`Backend ej nåbar – visar lokal startdata för ${familyId}`);
      } finally {
        clearTimeout(timeoutId);
        setHasLoadedFromBackend(true);
      }
    }

    fetchPlanner();
  }, [familyId, apiUrlWithFamily]);

  useEffect(() => {
    if (!hasLoadedFromBackend) return;

    async function savePlanner() {
      try {
        const response = await fetch(apiUrlWithFamily, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            members,
            tabs,
            tasks,
            prayers,
            currentTab,
            selectedDate,
          }),
        });

        if (!response.ok) {
          throw new Error(`Kunde inte spara. Status ${response.status}`);
        }

        setBackendStatus(`Synkad med backend · ${familyId}`);
      } catch (error) {
        console.error('Kunde inte spara till backend:', error);
        setBackendStatus(`Kunde inte spara till backend · ${familyId}`);
      }
    }

    savePlanner();
  }, [members, tabs, tasks, prayers, currentTab, selectedDate, hasLoadedFromBackend, familyId, apiUrlWithFamily]);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) return;
    setNotificationPermission(Notification.permission);
  }, []);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) return;
    if (notificationPermission !== 'granted') return;

    function checkReminders() {
      const now = Date.now();

      tasks.forEach((task) => {
        if (task.status === 'done') return;
        if (!task.due || !task.dueTime) return;
        if (task.reminderMinutes === '' || task.reminderMinutes === null || task.reminderMinutes === undefined) return;

        const taskDate = getTaskDateTime(task);
        if (!taskDate) return;

        const reminderTime = taskDate.getTime() - Number(task.reminderMinutes) * 60 * 1000;
        const reminderKey = `reminded:${familyId}:${task.id}:${task.due}:${task.dueTime}:${task.reminderMinutes}`;

        if (now >= reminderTime && !localStorage.getItem(reminderKey)) {
          new Notification('Påminnelse', {
            body: `${task.title}${task.dueTime ? ` kl ${formatTime(task.dueTime)}` : ''}`,
          });

          localStorage.setItem(reminderKey, '1');
        }
      });
    }

    checkReminders();
    const intervalId = setInterval(checkReminders, 60000);

    return () => clearInterval(intervalId);
  }, [tasks, familyId, notificationPermission]);

  const visibleTabs = tabs.filter(
    (tab) => tab.ownerId === activeMemberId || (tab.isShared && (tab.sharedWith || []).includes(activeMemberId))
  );
  const safeCurrentTab = visibleTabs.find((tab) => tab.id === currentTab)?.id || visibleTabs[0]?.id || 'biz';
  const currentTabInfo = tabs.find((tab) => tab.id === safeCurrentTab) || tabs[0];
  const currentOwner = members.find((member) => member.id === currentTabInfo?.ownerId);
  const currentSharedMembers = members.filter((member) => currentTabInfo?.sharedWith?.includes(member.id));
  const currentTasks = tasks.filter((task) => task.area === safeCurrentTab);

  const grouped = useMemo(() => {
    const scoped = tasks.filter((t) => t.area === safeCurrentTab);
    return {
      todo: scoped.filter((t) => t.status === 'todo'),
      doing: scoped.filter((t) => t.status === 'doing'),
      done: scoped.filter((t) => t.status === 'done'),
    };
  }, [tasks, safeCurrentTab]);

  const upcoming = useMemo(() => {
    return tasks
      .filter((task) => task.due && task.status !== 'done')
      .sort((a, b) => {
        const aDateTime = `${a.due}T${a.dueTime || '23:59'}`;
        const bDateTime = `${b.due}T${b.dueTime || '23:59'}`;
        return aDateTime.localeCompare(bDateTime);
      })
      .slice(0, 5);
  }, [tasks]);

  const stats = useMemo(() => {
    return {
      todo: tasks.filter((t) => t.status === 'todo').length,
      doing: tasks.filter((t) => t.status === 'doing').length,
      done: tasks.filter((t) => t.status === 'done').length,
      prayers: prayers.filter((p) => !p.answered).length,
    };
  }, [tasks, prayers]);

  const selectedDateTasks = useMemo(() => {
    return tasks
      .filter((task) => task.area === safeCurrentTab && task.due === selectedDate)
      .sort((a, b) => {
        const aTime = a.dueTime || '23:59';
        const bTime = b.dueTime || '23:59';
        if (aTime !== bTime) return aTime.localeCompare(bTime);
        return a.title.localeCompare(b.title, 'sv');
      });
  }, [tasks, safeCurrentTab, selectedDate]);

  async function enableNotifications() {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setBackendStatus('Den här enheten stöder inte notiser');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);

      if (permission === 'granted') {
        setBackendStatus('Notiser aktiverade');
      } else {
        setBackendStatus('Notiser tilläts inte');
      }
    } catch (error) {
      console.error('Kunde inte aktivera notiser:', error);
      setBackendStatus('Kunde inte aktivera notiser');
    }
  }

  function addItem() {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    if (safeCurrentTab === 'prayer') {
      setPrayers((prev) => [...prev, { id: 'p' + Date.now().toString(), title: trimmed, answered: false }]);
    } else {
            setTasks((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          title: trimmed,
          status: 'todo',
          area: safeCurrentTab,
          due: selectedDate || '2026-04-21',
          dueTime: newItemTime,
          reminderMinutes: newItemReminderMinutes === '' ? '' : Number(newItemReminderMinutes),
          note: '',
        },
      ]);
    }
    setNewItem('');
setNewItemTime('');
setNewItemReminderMinutes('');
setShowModal(false);
  }

  function moveTask(taskId, nextStatus) {
    setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, status: nextStatus } : task)));
  }

  function deleteTask(taskId) {
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
    if (editTaskId === taskId) closeEditTask();
  }

  function togglePrayer(prayerId) {
    setPrayers((prev) => prev.map((prayer) => (prayer.id === prayerId ? { ...prayer, answered: !prayer.answered } : prayer)));
  }

  function deletePrayer(prayerId) {
    setPrayers((prev) => prev.filter((prayer) => prayer.id !== prayerId));
  }

    function openEditTask(task) {
    setEditTaskId(task.id);
    setEditTaskTitle(task.title);
    setEditTaskDue(task.due || '');
    setEditTaskTime(task.dueTime || '');
    setEditTaskReminderMinutes(
      task.reminderMinutes === '' || task.reminderMinutes === null || task.reminderMinutes === undefined
        ? ''
        : String(task.reminderMinutes)
    );
    setEditTaskNote(task.note || '');
  }

    function closeEditTask() {
    setEditTaskId(null);
    setEditTaskTitle('');
    setEditTaskDue('');
    setEditTaskTime('');
    setEditTaskReminderMinutes('');
    setEditTaskNote('');
  }

    function saveEditedTask() {
    const trimmed = editTaskTitle.trim();
    if (!trimmed || !editTaskId) return;

    setTasks((prev) =>
      prev.map((task) =>
        task.id === editTaskId
          ? {
              ...task,
              title: trimmed,
              due: editTaskDue,
              dueTime: editTaskTime,
              reminderMinutes: editTaskReminderMinutes === '' ? '' : Number(editTaskReminderMinutes),
              note: editTaskNote,
            }
          : task
      )
    );

    closeEditTask();
  }

  function handleDragStart(taskId) {
    setDraggingTaskId(taskId);
  }

  function handleDrop(nextStatus) {
    if (!draggingTaskId) return;
    moveTask(draggingTaskId, nextStatus);
    setDraggingTaskId(null);
    setDragOverStatus(null);
  }

  function renameTab(tabId, label) {
    setTabs((prev) => prev.map((tab) => (tab.id === tabId ? { ...tab, label } : tab)));
  }

  function recolorTab(tabId, color) {
    setTabs((prev) => prev.map((tab) => (tab.id === tabId ? { ...tab, color } : tab)));
  }

  function addTab() {
    const trimmed = newTabName.trim();
    if (!trimmed) return;
    const id = `tab_${Date.now()}`;
    setTabs((prev) => [
      ...prev,
      {
        id,
        label: trimmed,
        color: newTabColor,
        icon: 'briefcase',
        locked: false,
        ownerId: activeMemberId,
        isShared: false,
        sharedWith: [],
      },
    ]);
    setNewTabName('');
    setNewTabColor(tabColors[0]);
  }

  function removeTab(tabId) {
    const firstTabId = tabs.find((tab) => !tab.locked && tab.id !== tabId)?.id || visibleTabs[0]?.id || 'biz';
    setTasks((prev) => prev.filter((task) => task.area !== tabId));
    setTabs((prev) => prev.filter((tab) => tab.id !== tabId));
    if (currentTab === tabId) setCurrentTab(firstTabId);
  }

  function addMember() {
    const trimmed = newMemberName.trim();
    if (!trimmed) return;
    setMembers((prev) => [...prev, { id: `m_${Date.now()}`, name: trimmed }]);
    setNewMemberName('');
  }

  function removeMember(memberId) {
    if (memberId === 'm1') return;
    setMembers((prev) => prev.filter((member) => member.id !== memberId));
    setTabs((prev) => prev.map((tab) => ({ ...tab, sharedWith: (tab.sharedWith || []).filter((id) => id !== memberId), ownerId: tab.ownerId === memberId ? 'm1' : tab.ownerId })));
  }

  function renameMember(memberId, name) {
    setMembers((prev) => prev.map((member) => member.id === memberId ? { ...member, name } : member));
  }

  function toggleTabShared(tabId) {
    setTabs((prev) => prev.map((tab) => tab.id === tabId ? { ...tab, isShared: !tab.isShared, sharedWith: tab.isShared ? [] : (tab.sharedWith || []) } : tab));
  }

  function toggleShareWithMember(tabId, memberId) {
    setTabs((prev) => prev.map((tab) => {
      if (tab.id !== tabId) return tab;
      const hasMember = (tab.sharedWith || []).includes(memberId);
      return {
        ...tab,
        sharedWith: hasMember ? (tab.sharedWith || []).filter((id) => id !== memberId) : [...(tab.sharedWith || []), memberId],
        isShared: true,
      };
    }));
  }

  function updateFamilyName() {
    const trimmed = newFamilyName.trim();
    if (!trimmed) return;
    const newFamilyId = `family_${trimmed.toLowerCase().replace(/[^a-z0-9åäö]+/gi, '_').replace(/^_+|_+$/g, '')}`;
    setHasLoadedFromBackend(false);
    setFamilyId(newFamilyId);
    setBackendStatus('Byter hushåll...');
    setNewFamilyName('');
  }

  async function copyCalendarUrl() {
    try {
      await navigator.clipboard.writeText(calendarUrl);
      setBackendStatus('Kalenderlänk kopierad');
      setTimeout(() => setBackendStatus(`Synkad med backend · ${familyId}`), 1800);
    } catch (error) {
      console.error('Kunde inte kopiera kalenderlänk:', error);
      setBackendStatus('Kunde inte kopiera kalenderlänk');
    }
  }

  return (
    <div className="min-h-screen" style={{ background: palette.bg, color: palette.text }}>
      <div className="mx-auto flex min-h-screen max-w-[1400px] flex-col" style={{ background: palette.page, boxShadow: '0 0 0 1px #e0e0db' }}>
        <header className="sticky top-0 z-10 flex items-center justify-between border-b px-4 py-4 md:px-6" style={{ background: palette.white, borderColor: palette.border }}>
          <div>
            <div className="text-sm font-semibold">MIGHTY PLANNER</div>
            <div className="mt-1 text-[11px]" style={{ color: palette.subtext }}>Hushåll: {getDisplayFamilyName(familyId)}</div>
            <div className="mt-1 text-[11px]" style={{ color: backendStatus.includes('Synkad') ? '#1D9E75' : '#888' }}>{backendStatus}</div>
          </div>
          <div className="flex items-center gap-3 flex-wrap justify-end">
            <div className="rounded-xl border px-3 py-2 text-xs" style={{ borderColor: palette.border, background: palette.white, color: palette.subtext }}>
              Hushåll: {getDisplayFamilyName(familyId)}
            </div>
            <div className="flex items-center gap-2 rounded-xl border px-3 py-2" style={{ borderColor: palette.border, background: palette.white }}>
              <div className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold text-white" style={{ background: currentTabInfo?.color || palette.biz }}>
                {getMemberBadge(members.find((m) => m.id === activeMemberId)?.name || '')}
              </div>
              <span className="text-xs" style={{ color: palette.subtext }}>Profil</span>
              <select
                value={activeMemberId}
                onChange={(e) => {
                  const id = e.target.value;
                  setActiveMemberId(id);
                  const first = tabs.find((t) => t.ownerId === id || (t.isShared && (t.sharedWith || []).includes(id)));
                  if (first) setCurrentTab(first.id);
                }}
                className="text-xs outline-none"
                style={{ background: 'transparent' }}
              >
                {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <button
              type="button"
              onClick={() => setShowCalendarInfo((prev) => !prev)}
              className="rounded-xl border px-3 py-2 text-xs flex items-center gap-2"
              style={{ borderColor: palette.border, background: palette.white }}
            >
              <LinkIcon size={14} />
              Kalender
            </button>
            <button
              type="button"
              onClick={async () => {
                setBackendStatus(`Laddar om från backend · ${familyId}...`);
                try {
                  const response = await fetch(apiUrlWithFamily);
                  const data = await response.json();
                  if (data.members) setMembers(data.members);
                  if (data.tabs) setTabs(data.tabs);
                  if (data.tasks) setTasks(data.tasks);
                  if (data.prayers) setPrayers(data.prayers);
                  if (data.currentTab) setCurrentTab(data.currentTab);
                  if (data.selectedDate) setSelectedDate(data.selectedDate);
                  setBackendStatus(`Synkad med backend · ${familyId}`);
                } catch (error) {
                  console.error('Kunde inte ladda om från backend:', error);
                  setBackendStatus(`Backend ej nåbar – behåller nuvarande data för ${familyId}`);
                }
              }}
              className="rounded-xl border px-3 py-2 text-xs"
              style={{ borderColor: palette.border, background: palette.white }}
            >
                <button
  type="button"
  onClick={enableNotifications}
  className="rounded-xl border px-3 py-2 text-xs"
  style={{ borderColor: palette.border, background: palette.white }}
>
  {notificationPermission === 'granted' ? 'Notiser aktiva' : 'Aktivera notiser'}
</button>
             <button
              type="button"
              onClick={enableNotifications}
              className="rounded-xl border px-3 py-2 text-xs"
              style={{ borderColor: palette.border, background: palette.white }}
            >
              {notificationPermission === 'granted' ? 'Notiser aktiva' : 'Aktivera notiser'}
            </button>   
              Ladda om
            </button>
            <button type="button" onClick={() => setShowSettings(true)} className="rounded-xl border p-2" style={{ borderColor: palette.border, background: palette.white }}>
              <Settings size={16} />
            </button>
          </div>
        </header>

        {showCalendarInfo && (
          <div className="border-b px-4 py-3 md:px-6" style={{ background: '#fafaf7', borderColor: palette.border }}>
            <div className="mb-2 text-sm font-semibold">Kalenderlänk för prenumeration</div>
            <div className="mb-3 text-xs" style={{ color: palette.subtext }}>
              Använd den här länken i Apple Kalender eller annan kalenderapp som stöder abonnerade kalendrar.
            </div>
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <input
                value={calendarUrl}
                readOnly
                className="flex-1 rounded-xl border px-3 py-2 text-xs outline-none"
                style={{ borderColor: palette.border, background: palette.white }}
              />
              <button
                type="button"
                onClick={copyCalendarUrl}
                className="rounded-xl border px-3 py-2 text-xs flex items-center justify-center gap-2"
                style={{ borderColor: palette.border, background: palette.white }}
              >
                <Copy size={14} />
                Kopiera kalenderlänk
              </button>
              <a
                href={calendarUrl.replace('https://', 'webcal://')}
                className="rounded-xl border px-3 py-2 text-xs text-center"
                style={{ borderColor: palette.border, background: palette.white }}
              >
                Öppna i kalender
              </a>
            </div>
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto border-b px-4 py-2" style={{ background: palette.white, borderColor: palette.border }}>
          {visibleTabs.map((tab) => {
            const Icon = getTabIcon(tab.icon);
            const active = safeCurrentTab === tab.id;
            const ownerName = getMemberName(members, tab.ownerId);
            const sharedCount = (tab.sharedWith || []).length;
            return (
              <button key={tab.id} type="button" onClick={() => setCurrentTab(tab.id)} className="flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition whitespace-nowrap" style={{ background: active ? tab.color : palette.white, color: active ? '#ffffff' : palette.text, borderColor: active ? tab.color : palette.border }}>
                <Icon size={16} />
                <span>{tab.label}</span>
                {!active && (
                  <span className="rounded-full px-2 py-[2px] text-[10px]" style={{ background: palette.soft, color: palette.subtext }}>
                    {ownerName}
                  </span>
                )}
                {tab.isShared && sharedCount > 0 && (
                  <span className="rounded-full px-2 py-[2px] text-[10px]" style={{ background: active ? 'rgba(255,255,255,0.18)' : '#e1f5ee', color: active ? '#fff' : '#1D9E75' }}>
                    Delad
                  </span>
                )}
              </button>
            );
          })}
        </div>



        <div className="grid flex-1 grid-cols-1 md:grid-cols-[250px_1fr]">
          <aside className="hidden border-r md:flex md:flex-col" style={{ background: palette.white, borderColor: palette.border }}>
            <div className="p-4 pb-0">
              <button type="button" onClick={() => setShowModal(true)} className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-white transition hover:opacity-95" style={{ background: palette.text }}>
                <Plus size={16} />
                {safeCurrentTab === 'prayer' ? 'Nytt böneämne' : 'Ny uppgift'}
              </button>
            </div>
            <div className="flex flex-1 flex-col gap-5 p-4">
              <SidebarSection title="Kalender">
                <div className="rounded-2xl border p-3.5" style={{ background: palette.white, borderColor: palette.border }}>
                  <SmallCalendar tasks={safeCurrentTab === 'prayer' ? [] : currentTasks} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
                </div>
              </SidebarSection>

              <SidebarSection title="Vald dag">
                <div className="rounded-2xl border p-3" style={{ background: palette.white, borderColor: palette.border }}>
                  <div className="mb-2 text-xs font-semibold" style={{ color: palette.subtext }}>{formatLongDate(selectedDate)}</div>
                  <div className="space-y-2">
                    {selectedDateTasks.length === 0 ? <div className="text-xs" style={{ color: '#bbb' }}>Inga uppgifter denna dag</div> : selectedDateTasks.map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => openEditTask(task)}
                        className="block w-full rounded-r-md border-l-2 px-3 py-2 text-left text-xs"
                        style={{ borderLeftColor: currentTabInfo.color, background: palette.page }}
                      >
                        <div className="text-[12px] text-neutral-800">{task.title}</div>
                        {task.dueTime ? (
                          <div className="mt-1 text-[10px] text-neutral-500">Kl. {formatTime(task.dueTime)}</div>
                        ) : null}
                        {task.note ? <div className="mt-1 text-[10px] text-neutral-500">{task.note}</div> : null}
                      </button>
                    ))}
                  </div>
                </div>
              </SidebarSection>

              <SidebarSection title="Kommande">
                <div className="space-y-2">
                  {upcoming.length === 0 ? <div className="rounded-r-md border-l-2 px-3 py-2 text-xs" style={{ borderLeftColor: '#d9d9d4', background: palette.page, color: '#bbb' }}>Inget planerat än</div> : upcoming.map((item) => {
                    const itemTab = tabs.find((t) => t.id === item.area);
                    return (
                      <button key={item.id} type="button" className="block w-full rounded-r-md border-l-2 px-3 py-2 text-left text-xs transition hover:opacity-90" style={{ borderLeftColor: itemTab?.color || palette.biz, background: palette.page }} onClick={() => { setCurrentTab(item.area); setSelectedDate(item.due); }}>
                        <div className="mb-0.5 text-[10px]" style={{ color: '#aaa' }}>
                          {formatShortDate(item.due)}
                          {item.dueTime ? ` kl ${formatTime(item.dueTime)}` : ''}
                        </div>
                        <div className="text-[12px] text-neutral-800">{item.title}</div>
                      </button>
                    );
                  })}
                </div>
              </SidebarSection>

              <SidebarSection title="Översikt">
                <div className="grid grid-cols-2 gap-2">
                  {[[ 'Att göra', stats.todo ], [ 'Pågående', stats.doing ], [ 'Klara', stats.done ], [ 'Bön kvar', stats.prayers ]].map(([label, value]) => (
                    <div key={label} className="rounded-lg px-3 py-2.5" style={{ background: palette.soft }}>
                      <div className="text-[22px] font-semibold leading-none">{value}</div>
                      <div className="mt-1 text-[10px]" style={{ color: '#aaa' }}>{label}</div>
                    </div>
                  ))}
                </div>
              </SidebarSection>
            </div>
          </aside>

          {safeCurrentTab === 'prayer' ? (
            <main className="p-4 md:p-6">
              <div className="rounded-3xl border p-5" style={{ background: palette.white, borderColor: palette.border }}>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Bönelista</h2>
                  <span className="rounded-full px-3 py-1 text-xs" style={{ background: palette.soft }}>{prayers.length} st</span>
                </div>
                <div className="space-y-3">
                  {prayers.map((prayer) => (
                    <div key={prayer.id} className="flex items-center justify-between gap-3 rounded-2xl border p-4" style={{ borderColor: palette.border, background: prayer.answered ? '#e1f5ee' : palette.white }}>
                      <div className="flex min-w-0 items-center gap-3">
                        <button type="button" onClick={() => togglePrayer(prayer.id)} className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: prayer.answered ? palette.family : palette.soft }}>
                          {prayer.answered ? <Check size={16} color="#fff" /> : <Heart size={14} />}
                        </button>
                        <div>
                          <div className="text-sm font-medium">{prayer.title}</div>
                          <div className="text-xs text-neutral-500">{prayer.answered ? 'Besvarad' : 'Pågående bön'}</div>
                        </div>
                      </div>
                      <button type="button" onClick={() => deletePrayer(prayer.id)} className="rounded-xl px-3 py-1.5 text-xs text-red-700" style={{ background: '#fcebeb' }}>Ta bort</button>
                    </div>
                  ))}
                  {prayers.length === 0 && <div className="rounded-2xl border border-dashed p-4 text-sm text-neutral-400" style={{ borderColor: palette.border }}>Inga böneämnen än.</div>}
                </div>
              </div>
            </main>
          ) : (
            <main className="p-4 md:p-4">
              <div className="grid gap-3 md:grid-cols-3 md:items-start">
                {Object.entries(columnLabels).map(([key, label]) => {
                  const dotColor = key === 'todo' ? '#cfcfc8' : currentTabInfo.color;
                  const isDragOver = dragOverStatus === key;
                  return (
                    <section key={key} className="min-w-0">
                      <div className="mb-2 flex items-center justify-between px-1 py-1">
                        <div className="flex items-center gap-2 text-[12px] font-semibold" style={{ color: palette.subtext }}>
                          <span className="inline-block h-2 w-2 rounded-full" style={{ background: dotColor }} />
                          {label}
                        </div>
                        <span className="rounded-full px-2 py-[2px] text-[11px]" style={{ background: '#e8e8e3', color: '#999' }}>{grouped[key].length}</span>
                      </div>
                      <div className="min-h-[80px] rounded-xl p-1 transition" style={{ background: isDragOver ? 'rgba(0,0,0,0.04)' : 'transparent' }} onDragOver={(e) => { e.preventDefault(); setDragOverStatus(key); }} onDragLeave={() => setDragOverStatus((prev) => (prev === key ? null : prev))} onDrop={() => handleDrop(key)}>
                        <div className="space-y-2">
                          {grouped[key].map((task) => (
                            <div key={task.id} draggable onDragStart={() => handleDragStart(task.id)} onDragEnd={() => { setDraggingTaskId(null); setDragOverStatus(null); }} className="group rounded-xl bg-white px-3 py-3 shadow-sm transition hover:shadow-md" style={{ border: `1px solid ${palette.border}`, borderLeft: key === 'doing' ? `3px solid ${currentTabInfo.color}` : `1px solid ${palette.border}`, borderRadius: key === 'doing' ? '0 12px 12px 0' : '12px', opacity: draggingTaskId === task.id ? 0.5 : key === 'done' ? 0.6 : 1, cursor: 'grab' }}>
                              <div className="mb-2 flex items-start justify-between gap-2">
                                <div className="flex min-w-0 items-start gap-2">
                                  <button type="button" onClick={(e) => { e.stopPropagation(); moveTask(task.id, task.status === 'done' ? 'todo' : 'done'); }} className="mt-[2px] h-4 w-4 rounded border" style={{ borderColor: '#bbb', background: task.status === 'done' ? palette.family : '#fff' }} />
                                  <button type="button" onClick={() => openEditTask(task)} className="min-w-0 text-left">
                                    <div className="text-[13px] font-medium leading-snug" style={{ textDecoration: key === 'done' ? 'line-through' : 'none' }}>{task.title}</div>
                                  </button>
                                </div>
                                <button type="button" onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }} className="opacity-0 group-hover:opacity-100 text-[10px]" style={{ color: '#aaa' }}>✕</button>
                              </div>
                              <button type="button" onClick={() => openEditTask(task)} className="mb-2 w-full text-left">
                                <div className="flex items-center justify-between text-[10px] gap-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="rounded-full px-2 py-[3px]" style={{ background: palette.soft, color: '#666' }}>{currentTabInfo.label}</span>
                                    <span className="rounded-full px-2 py-[3px]" style={{ background: '#f3f3ef', color: '#777' }}>{getMemberName(members, currentTabInfo.ownerId)}</span>
                                    {currentTabInfo.isShared ? <span className="rounded-full px-2 py-[3px]" style={{ background: '#e1f5ee', color: '#1D9E75' }}>Delad</span> : null}
                                  </div>
                                  <span style={{ color: '#aaa' }}>
                                    {formatShortDate(task.due)}
                                    {task.dueTime ? ` kl ${formatTime(task.dueTime)}` : ''}
                                  </span>
                                </div>
                                {task.reminderMinutes !== '' && task.reminderMinutes !== null && task.reminderMinutes !== undefined ? (
                                  <div className="mt-2 text-[11px]" style={{ color: '#888' }}>
                                    Påminnelse: {getReminderLabel(task.reminderMinutes)}
                                  </div>
                                ) : null}
                                {task.reminderMinutes !== '' && task.reminderMinutes !== null && task.reminderMinutes !== undefined ? (
  <div className="mt-2 text-[11px]" style={{ color: '#888' }}>
    Påminnelse: {getReminderLabel(task.reminderMinutes)}
  </div>
) : null}
{task.note ? <div className="mt-2 text-[11px]" style={{ color: '#888' }}>{task.note}</div> : null}
                              </button>
                              <div className="flex flex-wrap gap-1 text-[10px]">
                                {key !== 'todo' && <button type="button" onClick={(e) => { e.stopPropagation(); moveTask(task.id, 'todo'); }} className="rounded-md px-2 py-[3px]" style={{ background: palette.soft }}>Att göra</button>}
                                {key !== 'doing' && <button type="button" onClick={(e) => { e.stopPropagation(); moveTask(task.id, 'doing'); }} className="rounded-md px-2 py-[3px]" style={{ background: '#e6f1fb' }}>Pågående</button>}
                                {key !== 'done' && <button type="button" onClick={(e) => { e.stopPropagation(); moveTask(task.id, 'done'); }} className="rounded-md px-2 py-[3px]" style={{ background: '#e1f5ee' }}>Klar</button>}
                              </div>
                            </div>
                          ))}
                          {grouped[key].length === 0 && <button type="button" onClick={() => setShowModal(true)} className="w-full rounded-xl border border-dashed px-3 py-3 text-center text-[12px]" style={{ borderColor: '#d5d5d0', color: '#bbb', background: 'transparent' }}>+ Lägg till</button>}
                        </div>
                        {grouped[key].length > 0 && <button type="button" onClick={() => setShowModal(true)} className="mt-2 w-full rounded-xl border border-dashed px-3 py-2 text-center text-[12px] transition hover:bg-white" style={{ borderColor: '#d5d5d0', color: '#bbb' }}>+ Lägg till</button>}
                      </div>
                    </section>
                  );
                })}
              </div>
            </main>
          )}
        </div>

        <button type="button" onClick={() => setShowModal(true)} className="fixed bottom-6 right-6 z-20 rounded-full p-4 text-white shadow-lg md:hidden" style={{ background: palette.text }}>
          <Plus size={20} />
        </button>

        {showModal && (
          <div className="fixed inset-0 z-30 flex items-start justify-center bg-black/40 p-4 overflow-y-auto">
            <div className="w-full max-w-md rounded-3xl p-5 shadow-xl" style={{ background: palette.white }}>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">{safeCurrentTab === 'prayer' ? 'Nytt böneämne' : 'Ny uppgift'}</h3>
                <button type="button" onClick={() => setShowModal(false)} className="rounded-full p-2" style={{ background: palette.soft }}><X size={16} /></button>
              </div>
              <div className="mb-3 text-sm text-neutral-500">{safeCurrentTab === 'prayer' ? 'Det här sparas i din bönelista.' : `Uppgiften sparas i fliken: ${currentTabInfo.label}`}</div>
              <div className="mb-3 text-[11px] text-neutral-400">Sparas till backend i hushållet. Profilvalet minns den här enheten lokalt.</div>
              <input value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder={safeCurrentTab === 'prayer' ? 'Skriv ett böneämne...' : 'Skriv en uppgift...'} className="mb-4 w-full rounded-2xl border px-4 py-3 outline-none" style={{ borderColor: palette.border }} />
              {safeCurrentTab !== 'prayer' && (
                <input
                  type="time"
                  value={newItemTime}
                  onChange={(e) => setNewItemTime(e.target.value)}
                  className="mb-4 w-full rounded-2xl border px-4 py-3 outline-none"
                  style={{ borderColor: palette.border }}
                />
              )}
                            {safeCurrentTab !== 'prayer' && (
                <select
                  value={newItemReminderMinutes}
                  onChange={(e) => setNewItemReminderMinutes(e.target.value)}
                  className="mb-4 w-full rounded-2xl border px-4 py-3 outline-none"
                  style={{ borderColor: palette.border, background: palette.white }}
                >
                  <option value="">Ingen påminnelse</option>
                  <option value="0">Vid starttid</option>
                  <option value="5">5 min före</option>
                  <option value="10">10 min före</option>
                  <option value="15">15 min före</option>
                  <option value="30">30 min före</option>
                  <option value="60">1 tim före</option>
                  <option value="120">2 tim före</option>
                  <option value="1440">1 dag före</option>
                </select>
              )}
                            <select
                value={editTaskReminderMinutes}
                onChange={(e) => setEditTaskReminderMinutes(e.target.value)}
                className="mb-3 w-full rounded-2xl border px-4 py-3 outline-none"
                style={{ borderColor: palette.border, background: palette.white }}
              >
                <option value="">Ingen påminnelse</option>
                <option value="0">Vid starttid</option>
                <option value="5">5 min före</option>
                <option value="10">10 min före</option>
                <option value="15">15 min före</option>
                <option value="30">30 min före</option>
                <option value="60">1 tim före</option>
                <option value="120">2 tim före</option>
                <option value="1440">1 dag före</option>
              </select>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowModal(false)} className="rounded-2xl px-4 py-2 text-sm" style={{ background: palette.soft }}>Avbryt</button>
                <button type="button" onClick={addItem} className="rounded-2xl px-4 py-2 text-sm text-white" style={{ background: currentTabInfo.color }}>Spara</button>
              </div>
            </div>
          </div>
        )}

        {editTaskId && (
          <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-3xl p-5 shadow-xl" style={{ background: palette.white }}>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Redigera uppgift</h3>
                <button type="button" onClick={closeEditTask} className="rounded-full p-2" style={{ background: palette.soft }}><X size={16} /></button>
              </div>
              <div className="mb-3 text-sm text-neutral-500">Uppgiften ligger i fliken: {currentTabInfo.label}</div>
              <input value={editTaskTitle} onChange={(e) => setEditTaskTitle(e.target.value)} placeholder="Uppgiftens namn" className="mb-3 w-full rounded-2xl border px-4 py-3 outline-none" style={{ borderColor: palette.border }} />
              <input type="date" value={editTaskDue} onChange={(e) => setEditTaskDue(e.target.value)} className="mb-3 w-full rounded-2xl border px-4 py-3 outline-none" style={{ borderColor: palette.border }} />
              <input
                type="time"
                value={editTaskTime}
                onChange={(e) => setEditTaskTime(e.target.value)}
                className="mb-3 w-full rounded-2xl border px-4 py-3 outline-none"
                style={{ borderColor: palette.border }}
              />
              <select
  value={editTaskReminderMinutes}
  onChange={(e) => setEditTaskReminderMinutes(e.target.value)}
  className="mb-3 w-full rounded-2xl border px-4 py-3 outline-none"
  style={{ borderColor: palette.border, background: palette.white }}
>
  <option value="">Ingen påminnelse</option>
  <option value="0">Vid starttid</option>
  <option value="5">5 min före</option>
  <option value="10">10 min före</option>
  <option value="15">15 min före</option>
  <option value="30">30 min före</option>
  <option value="60">1 tim före</option>
  <option value="120">2 tim före</option>
  <option value="1440">1 dag före</option>
</select>
              <textarea value={editTaskNote} onChange={(e) => setEditTaskNote(e.target.value)} placeholder="Notering" className="mb-4 min-h-[100px] w-full rounded-2xl border px-4 py-3 outline-none" style={{ borderColor: palette.border }} />
              <div className="flex justify-between gap-2">
                <button type="button" onClick={() => deleteTask(editTaskId)} className="rounded-2xl px-4 py-2 text-sm text-red-700" style={{ background: '#fcebeb' }}>Ta bort</button>
                <div className="flex gap-2">
                  <button type="button" onClick={closeEditTask} className="rounded-2xl px-4 py-2 text-sm" style={{ background: palette.soft }}>Avbryt</button>
                  <button type="button" onClick={saveEditedTask} className="rounded-2xl px-4 py-2 text-sm text-white" style={{ background: currentTabInfo.color }}>Spara</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showSettings && (
          <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-2xl rounded-3xl p-5 shadow-xl max-h-[80vh] overflow-y-auto" style={{ background: palette.white }}>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Inställningar för flikar</h3>
                <button type="button" onClick={() => setShowSettings(false)} className="rounded-full p-2" style={{ background: palette.soft }}><X size={16} /></button>
              </div>

              <div className="mb-5 space-y-3">
                {tabs.map((tab) => {
                  const Icon = getTabIcon(tab.icon);
                  return (
                    <div key={tab.id} className="rounded-2xl border p-3" style={{ borderColor: palette.border }}>
                      <div className="mb-3 flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full text-white" style={{ background: tab.color }}><Icon size={16} /></div>
                        <input value={tab.label} onChange={(e) => renameTab(tab.id, e.target.value)} className="flex-1 rounded-xl border px-3 py-2 text-sm outline-none" style={{ borderColor: palette.border }} />
                        {!tab.locked && <button type="button" onClick={() => removeTab(tab.id)} className="rounded-xl p-2 text-red-700" style={{ background: '#fcebeb' }}><Trash2 size={16} /></button>}
                      </div>
                      <div className="mb-3 flex flex-wrap gap-2">
                        {tabColors.map((color) => <button key={color} type="button" onClick={() => recolorTab(tab.id, color)} className="h-7 w-7 rounded-full border-2" style={{ background: color, borderColor: tab.color === color ? palette.text : 'transparent' }} />)}
                      </div>
                      <div className="rounded-xl border p-3" style={{ borderColor: palette.border, background: palette.page }}>
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <div className="text-sm font-medium">Delning</div>
                          <button type="button" onClick={() => toggleTabShared(tab.id)} className="rounded-xl px-3 py-2 text-xs" style={{ background: tab.isShared ? '#e1f5ee' : palette.soft }}>
                            {tab.isShared ? 'Delad' : 'Privat'}
                          </button>
                        </div>
                        <div className="mb-2 text-xs" style={{ color: palette.subtext }}>
                          Ägare: {members.find((m) => m.id === tab.ownerId)?.name || 'Okänd'}
                        </div>
                        {tab.isShared ? (
                          <div className="flex flex-wrap gap-2">
                            {members.filter((member) => member.id !== tab.ownerId).map((member) => {
                              const active = (tab.sharedWith || []).includes(member.id);
                              return (
                                <button
                                  key={member.id}
                                  type="button"
                                  onClick={() => toggleShareWithMember(tab.id, member.id)}
                                  className="rounded-full border px-3 py-1.5 text-xs"
                                  style={{
                                    background: active ? tab.color : palette.white,
                                    color: active ? '#fff' : palette.text,
                                    borderColor: active ? tab.color : palette.border,
                                  }}
                                >
                                  {member.name}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-xs" style={{ color: '#999' }}>Bara ägaren ser denna flik.</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mb-4 rounded-2xl border p-4" style={{ borderColor: palette.border, background: palette.page }}>
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Users size={16} /> Familjemedlemmar</div>
                <div className="mb-2 text-[11px]" style={{ color: palette.subtext }}>
                  Vald profil sparas bara på den här enheten. Ni behöver inte logga in.
                </div>
                <div className="mb-3 space-y-2">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2" style={{ borderColor: palette.border, background: palette.white }}>
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => setActiveMemberId(member.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                          style={{ background: activeMemberId === member.id ? palette.text : (tabs.find((tab) => tab.ownerId === member.id)?.color || palette.biz) }}
                        >
                          {getMemberBadge(member.name)}
                        </button>
                        <input value={member.name} onChange={(e) => renameMember(member.id, e.target.value)} className="flex-1 bg-transparent text-sm outline-none" />
                      </div>
                      {member.id !== 'm1' ? <button type="button" onClick={() => removeMember(member.id)} className="rounded-lg px-2 py-1 text-xs text-red-700" style={{ background: '#fcebeb' }}>Ta bort</button> : <div className="text-xs" style={{ color: '#999' }}>Standardprofil</div>}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} placeholder="Namn på familjemedlem" className="flex-1 rounded-xl border px-3 py-2 text-sm outline-none" style={{ borderColor: palette.border, background: palette.white }} />
                  <button type="button" onClick={addMember} className="rounded-xl px-4 py-2 text-sm text-white" style={{ background: palette.text }}>Lägg till</button>
                </div>
              </div>

              <div className="mb-4 rounded-2xl border p-4" style={{ borderColor: palette.border, background: palette.page }}>
                <div className="mb-3 text-sm font-semibold">Byt namn på hushållet</div>
                <div className="flex gap-2">
                  <input value={newFamilyName} onChange={(e) => setNewFamilyName(e.target.value)} placeholder="Till exempel Frykfamiljen" className="flex-1 rounded-xl border px-3 py-2 text-sm outline-none" style={{ borderColor: palette.border, background: palette.white }} />
                  <button type="button" onClick={updateFamilyName} className="rounded-xl px-4 py-2 text-sm text-white" style={{ background: palette.text }}>
                    Byt
                  </button>
                </div>
                <div className="mt-2 text-[11px]" style={{ color: palette.subtext }}>
                  Detta byter vilket hushåll appen är kopplad till i databasen.
                </div>
                <div className="mt-2 text-[11px]" style={{ color: palette.subtext }}>
                  Profilvalet sparas separat per enhet och påverkar inte andra i hushållet.
                </div>
              </div>

              <div className="rounded-2xl border p-4" style={{ borderColor: palette.border, background: palette.page }}>
                <div className="mb-3 text-sm font-semibold">Lägg till ny flik</div>
                <div className="mb-2 text-[11px]" style={{ color: palette.subtext }}>
                  Fliken skapas för profilen: {getMemberName(members, activeMemberId)}
                </div>
                <div className="mb-3 flex gap-2">
                  <input value={newTabName} onChange={(e) => setNewTabName(e.target.value)} placeholder="Namn på ny flik" className="flex-1 rounded-xl border px-3 py-2 text-sm outline-none" style={{ borderColor: palette.border, background: palette.white }} />
                  <button type="button" onClick={addTab} className="rounded-xl px-4 py-2 text-sm text-white" style={{ background: palette.text }}>Lägg till</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tabColors.map((color) => <button key={color} type="button" onClick={() => setNewTabColor(color)} className="h-7 w-7 rounded-full border-2" style={{ background: color, borderColor: newTabColor === color ? palette.text : 'transparent' }} />)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}