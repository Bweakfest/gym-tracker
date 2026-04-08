import { createContext, useContext, useState, useCallback } from 'react';

const translations = {
  en: {
    // Nav
    dashboard: 'Dashboard', workouts: 'Workouts', meals: 'Meals',
    weight: 'Weight', coach: 'AI Coach', calendar: 'Calendar', settings: 'Settings',
    // Page subtitles
    dashSub: 'Your fitness overview at a glance',
    workoutsSub: 'Log and track your exercises',
    mealsSub: 'Track your daily nutrition',
    weightSub: 'Track your weight and body measurements',
    coachSub: 'Personalized advice powered by Claude AI',
    calendarSub: 'View your training and nutrition history',
    settingsSub: 'Manage your account and preferences',
    // Common
    save: 'Save', cancel: 'Cancel', delete: 'Delete', edit: 'Edit',
    add: 'Add', close: 'Close', today: 'Today', send: 'Send',
    logOut: 'Log Out', exportData: 'Export Data', clearChat: 'Clear Chat',
    // Settings
    profile: 'Profile', displayName: 'Display Name', email: 'Email',
    changePassword: 'Change Password', currentPassword: 'Current Password',
    newPassword: 'New Password', confirmPassword: 'Confirm New Password',
    preferences: 'Preferences', language: 'Language', units: 'Units',
    theme: 'Theme', dark: 'Dark', light: 'Light',
    notifications: 'Notifications',
    mealReminder: 'Meal logging reminder',
    workoutReminder: 'Workout logging reminder',
    yourData: 'Your Data', exportAllData: 'Export all your data as JSON',
    account: 'Account', signOut: 'Sign out of your account',
    deleteAccount: 'Permanently delete your account and all data',
    typeDelete: 'Type DELETE to confirm:',
    profilePhoto: 'Profile Photo', uploadPhoto: 'Upload', removePhoto: 'Remove',
    // Meals
    food: 'Food', calories: 'Calories', protein: 'Protein',
    carbs: 'Carbs', fat: 'Fat', servings: 'Servings',
    searchFood: 'Search food...', quickAdd: 'Quick Add',
    repeatYesterday: 'Repeat Yesterday', favourites: 'Favourites',
    // Workouts
    exercise: 'Exercise', sets: 'Sets', reps: 'Reps',
    restTimer: 'Rest Timer', templates: 'Templates', volume: 'Volume',
    // Weight
    goalWeight: 'Goal Weight', weeklyAvg: 'Weekly Averages',
    measurements: 'Measurements', waist: 'Waist', chest: 'Chest',
    arms: 'Arms', hips: 'Hips', thighs: 'Thighs',
    // Calendar
    month: 'Month', week: 'Week', streak: 'Streak',
    restDay: 'Rest day', noActivity: 'No activity recorded on this day.',
    // Coach
    askCoach: 'Ask your coach anything...',
    coachBanner: 'I can see your meals, workouts, weight, and goals. Ask me anything and I\'ll give advice based on your actual data.',
  },
  de: {
    dashboard: 'Dashboard', workouts: 'Training', meals: 'Mahlzeiten',
    weight: 'Gewicht', coach: 'KI-Coach', calendar: 'Kalender', settings: 'Einstellungen',
    dashSub: 'Dein Fitness-\u00dcberblick auf einen Blick',
    workoutsSub: '\u00dcbungen protokollieren und verfolgen',
    mealsSub: 'Deine t\u00e4gliche Ern\u00e4hrung verfolgen',
    weightSub: 'Gewicht und K\u00f6rperma\u00dfe verfolgen',
    coachSub: 'Personalisierte Beratung mit Claude KI',
    calendarSub: 'Trainings- und Ern\u00e4hrungshistorie ansehen',
    settingsSub: 'Konto und Einstellungen verwalten',
    save: 'Speichern', cancel: 'Abbrechen', delete: 'L\u00f6schen', edit: 'Bearbeiten',
    add: 'Hinzuf\u00fcgen', close: 'Schlie\u00dfen', today: 'Heute', send: 'Senden',
    logOut: 'Abmelden', exportData: 'Daten exportieren', clearChat: 'Chat l\u00f6schen',
    profile: 'Profil', displayName: 'Anzeigename', email: 'E-Mail',
    changePassword: 'Passwort \u00e4ndern', currentPassword: 'Aktuelles Passwort',
    newPassword: 'Neues Passwort', confirmPassword: 'Neues Passwort best\u00e4tigen',
    preferences: 'Einstellungen', language: 'Sprache', units: 'Einheiten',
    theme: 'Design', dark: 'Dunkel', light: 'Hell',
    notifications: 'Benachrichtigungen',
    mealReminder: 'Erinnerung Mahlzeiten erfassen',
    workoutReminder: 'Erinnerung Training erfassen',
    yourData: 'Deine Daten', exportAllData: 'Alle Daten als JSON exportieren',
    account: 'Konto', signOut: 'Von deinem Konto abmelden',
    deleteAccount: 'Konto und alle Daten dauerhaft l\u00f6schen',
    typeDelete: 'Tippe DELETE zum Best\u00e4tigen:',
    profilePhoto: 'Profilfoto', uploadPhoto: 'Hochladen', removePhoto: 'Entfernen',
    food: 'Essen', calories: 'Kalorien', protein: 'Protein',
    carbs: 'Kohlenhydrate', fat: 'Fett', servings: 'Portionen',
    searchFood: 'Essen suchen...', quickAdd: 'Schnell hinzuf\u00fcgen',
    repeatYesterday: 'Gestern wiederholen', favourites: 'Favoriten',
    exercise: '\u00dcbung', sets: 'S\u00e4tze', reps: 'Wiederholungen',
    restTimer: 'Pausentimer', templates: 'Vorlagen', volume: 'Volumen',
    goalWeight: 'Zielgewicht', weeklyAvg: 'Wochendurchschnitt',
    measurements: 'K\u00f6rperma\u00dfe', waist: 'Taille', chest: 'Brust',
    arms: 'Arme', hips: 'H\u00fcfte', thighs: 'Oberschenkel',
    month: 'Monat', week: 'Woche', streak: 'Serie',
    restDay: 'Ruhetag', noActivity: 'Keine Aktivit\u00e4t an diesem Tag.',
    askCoach: 'Frag deinen Coach...',
    coachBanner: 'Ich kann deine Mahlzeiten, Trainings, Gewicht und Ziele sehen. Frag mich und ich gebe Ratschl\u00e4ge basierend auf deinen Daten.',
  },
  fr: {
    dashboard: 'Tableau de bord', workouts: 'Entra\u00eenements', meals: 'Repas',
    weight: 'Poids', coach: 'Coach IA', calendar: 'Calendrier', settings: 'Param\u00e8tres',
    dashSub: 'Votre aper\u00e7u fitness en un coup d\u2019\u0153il',
    workoutsSub: 'Enregistrez et suivez vos exercices',
    mealsSub: 'Suivez votre nutrition quotidienne',
    weightSub: 'Suivez votre poids et mensurations',
    coachSub: 'Conseils personnalis\u00e9s par Claude IA',
    calendarSub: 'Voir l\u2019historique entra\u00eenement et nutrition',
    settingsSub: 'G\u00e9rez votre compte et pr\u00e9f\u00e9rences',
    save: 'Enregistrer', cancel: 'Annuler', delete: 'Supprimer', edit: 'Modifier',
    add: 'Ajouter', close: 'Fermer', today: 'Aujourd\u2019hui', send: 'Envoyer',
    logOut: 'D\u00e9connexion', exportData: 'Exporter', clearChat: 'Effacer le chat',
    profile: 'Profil', displayName: 'Nom affich\u00e9', email: 'E-mail',
    changePassword: 'Changer le mot de passe', currentPassword: 'Mot de passe actuel',
    newPassword: 'Nouveau mot de passe', confirmPassword: 'Confirmer le mot de passe',
    preferences: 'Pr\u00e9f\u00e9rences', language: 'Langue', units: 'Unit\u00e9s',
    theme: 'Th\u00e8me', dark: 'Sombre', light: 'Clair',
    notifications: 'Notifications',
    mealReminder: 'Rappel saisie des repas',
    workoutReminder: 'Rappel saisie des entra\u00eenements',
    yourData: 'Vos donn\u00e9es', exportAllData: 'Exporter toutes vos donn\u00e9es en JSON',
    account: 'Compte', signOut: 'Se d\u00e9connecter de votre compte',
    deleteAccount: 'Supprimer d\u00e9finitivement votre compte et donn\u00e9es',
    typeDelete: 'Tapez DELETE pour confirmer :',
    profilePhoto: 'Photo de profil', uploadPhoto: 'T\u00e9l\u00e9charger', removePhoto: 'Supprimer',
    food: 'Aliment', calories: 'Calories', protein: 'Prot\u00e9ines',
    carbs: 'Glucides', fat: 'Lipides', servings: 'Portions',
    searchFood: 'Chercher un aliment...', quickAdd: 'Ajout rapide',
    repeatYesterday: 'R\u00e9p\u00e9ter hier', favourites: 'Favoris',
    exercise: 'Exercice', sets: 'S\u00e9ries', reps: 'R\u00e9p\u00e9titions',
    restTimer: 'Minuteur repos', templates: 'Mod\u00e8les', volume: 'Volume',
    goalWeight: 'Poids cible', weeklyAvg: 'Moyennes hebdomadaires',
    measurements: 'Mensurations', waist: 'Taille', chest: 'Poitrine',
    arms: 'Bras', hips: 'Hanches', thighs: 'Cuisses',
    month: 'Mois', week: 'Semaine', streak: 'S\u00e9rie',
    restDay: 'Jour de repos', noActivity: 'Aucune activit\u00e9 enregistr\u00e9e ce jour.',
    askCoach: 'Posez votre question au coach...',
    coachBanner: 'Je vois vos repas, entra\u00eenements, poids et objectifs. Posez-moi une question et je vous donnerai des conseils bas\u00e9s sur vos donn\u00e9es.',
  },
};

const LangContext = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem('lang') || 'en');

  const setLang = (l) => { setLangState(l); localStorage.setItem('lang', l); };
  const t = useCallback((key) => translations[lang]?.[key] || translations.en[key] || key, [lang]);

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);
