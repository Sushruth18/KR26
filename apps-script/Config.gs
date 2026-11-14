// ============================================================================
// GENERATED FILE — do not edit by hand.
// Source: src/data/site.json, src/data/events.json, src/lib/rules.ts
// Regenerate with `npm run gas:config` (also runs on every build), then paste
// the new contents into the Config.gs file of the Apps Script project and
// redeploy (see apps-script/README.md, "Updating the script").
// ============================================================================

// Format number Code.gs checks (CONFIG_MISMATCH if it differs) and a hash of everything below.
// GET ?action=status returns configVersion — compare it with the value printed by `npm run gas:config`.
var CONFIG_SCHEMA = 6;
var CONFIG_VERSION = '4d8d0965';

var CONFIG = {
  "minFormMs": 3000,
  "contactEmail": "",
  "siteUrl": "https://kr2k26-bmsit.netlify.app",
  "departments": [
    "CSE",
    "ISE",
    "AIML",
    "ECE",
    "EEE",
    "ETE",
    "Mech",
    "Civil",
    "MBA",
    "MCA"
  ],
  "semesters": {
    "default": [
      1,
      3,
      5,
      7
    ],
    "byDepartment": {
      "MBA": [
        1,
        3
      ],
      "MCA": [
        1,
        3
      ]
    }
  },
  "rules": {
    "name": {
      "pattern": "^[A-Za-z\\u0C80-\\u0CFF\\u200C\\u200D. ]+$",
      "min": 2,
      "max": 60
    },
    "usn": {
      "max": 20
    },
    "empId": {
      "pattern": "^[A-Z0-9]+$",
      "max": 20
    },
    "phone": {
      "pattern": "^[6-9]\\d{9}$"
    },
    "email": {
      "pattern": "^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$",
      "max": 100
    },
    "teamName": {
      "pattern": "^[A-Za-z0-9\\u0C80-\\u0CFF\\u200C\\u200D.&' -]+$",
      "min": 2,
      "max": 40
    },
    "departmentOther": {
      "min": 2,
      "max": 40
    },
    "whatsapp": {
      "group": "^https://chat\\.whatsapp\\.com/[A-Za-z0-9]{10,40}$",
      "channel": "^https://whatsapp\\.com/channel/[A-Za-z0-9_-]{10,60}$"
    }
  },
  "day1Date": "2026-11-20",
  "day2Date": "2026-11-21",
  "eventStart": "2026-11-21T09:00:00+05:30",
  "eventEnd": "2026-11-21T17:45:00+05:30",
  "events": {
    "s-essay": {
      "code": "ESY",
      "category": "students",
      "name": {
        "kn": "ಪ್ರಬಂಧ ಬರಹ",
        "en": "Essay Writing"
      },
      "teamSize": {
        "min": 1,
        "max": 1
      },
      "date": "2026-11-20",
      "time": "12:30",
      "endTime": "16:30",
      "eligibility": "",
      "maxTeams": 0,
      "venue": {
        "kn": "ಬಿಎಸ್‌ಎನ್ ಕೊಠಡಿ 422",
        "en": "BSN 422"
      },
      "sheetName": "ESY – Essay Writing",
      "deadline": "2026-11-18T23:59:00+05:30"
    },
    "s-poem": {
      "code": "POM",
      "category": "students",
      "name": {
        "kn": "ಕವನ ಸ್ಪರ್ಧೆ",
        "en": "Poem"
      },
      "teamSize": {
        "min": 1,
        "max": 1
      },
      "date": "2026-11-20",
      "time": "12:30",
      "endTime": "16:30",
      "eligibility": "",
      "maxTeams": 0,
      "venue": {
        "kn": "ಎಸ್‌ಎಂವಿ ಬ್ಲಾಕ್ (ಅಕಾಡೆಮಿಕ್ ಬ್ಲಾಕ್), ೨ನೇ ಮಹಡಿ ಸಭಾಂಗಣ",
        "en": "SMV Block (Academic Block), 2nd Floor Auditorium"
      },
      "sheetName": "POM – Poem",
      "deadline": "2026-11-18T23:59:00+05:30"
    },
    "s-painting": {
      "code": "PNT",
      "category": "students",
      "name": {
        "kn": "ಚಿತ್ರಕಲೆ",
        "en": "Painting"
      },
      "teamSize": {
        "min": 1,
        "max": 1
      },
      "date": "2026-11-20",
      "time": "12:30",
      "endTime": "16:30",
      "eligibility": "",
      "maxTeams": 0,
      "venue": {
        "kn": "ವಿಶ್ವೇಶ್ವರಯ್ಯ ಸಭಾಂಗಣ (ಆರ್ಕಿಟೆಕ್ಚರ್ ಬ್ಲಾಕ್)",
        "en": "Visvesvaraya Auditorium (Architecture Block)"
      },
      "sheetName": "PNT – Painting",
      "deadline": "2026-11-18T23:59:00+05:30"
    },
    "s-debate": {
      "code": "DEB",
      "category": "students",
      "name": {
        "kn": "ವಾದ-ವಿವಾದ",
        "en": "Debate"
      },
      "teamSize": {
        "min": 1,
        "max": 1
      },
      "date": "2026-11-20",
      "time": "12:30",
      "endTime": "16:30",
      "eligibility": "",
      "maxTeams": 0,
      "venue": {
        "kn": "ಎಸ್‌ಎಂವಿ ಬ್ಲಾಕ್ (ಅಕಾಡೆಮಿಕ್ ಬ್ಲಾಕ್), ೧ನೇ ಮಹಡಿ ಸಭಾಂಗಣ",
        "en": "SMV Block (Academic Block), 1st Floor Auditorium"
      },
      "sheetName": "DEB – Debate",
      "deadline": "2026-11-18T23:59:00+05:30"
    },
    "s-quiz": {
      "code": "QIZ",
      "category": "students",
      "name": {
        "kn": "ಪ್ರಶ್ನೋತ್ತರ ಸ್ಪರ್ಧೆ",
        "en": "Quiz"
      },
      "teamSize": {
        "min": 1,
        "max": 1
      },
      "date": "2026-11-20",
      "time": "12:30",
      "endTime": "16:30",
      "eligibility": "",
      "maxTeams": 0,
      "venue": {
        "kn": "TODO-CONFIRM",
        "en": "TODO-CONFIRM"
      },
      "sheetName": "QIZ – Quiz",
      "deadline": "2026-11-18T23:59:00+05:30"
    },
    "s-group-dance": {
      "code": "GDN",
      "category": "students",
      "name": {
        "kn": "ಸಾಮೂಹಿಕ ನೃತ್ಯ",
        "en": "Group Dance"
      },
      "teamSize": {
        "min": 4,
        "max": 12
      },
      "date": "2026-11-20",
      "time": "12:30",
      "endTime": "16:30",
      "eligibility": "",
      "maxTeams": 0,
      "venue": {
        "kn": "ಎಸ್‌ಜೆಬಿ ೫ನೇ ಮಹಡಿ, ಆಂಫಿಥಿಯೇಟರ್",
        "en": "SJB 5th Floor Amphitheatre"
      },
      "sheetName": "GDN – Group Dance",
      "deadline": "2026-11-18T23:59:00+05:30"
    },
    "s-treasure-hunt": {
      "code": "TRH",
      "category": "students",
      "name": {
        "kn": "ಖಜಾನೆ ಹುಡುಕಾಟ",
        "en": "Treasure Hunt"
      },
      "teamSize": {
        "min": 4,
        "max": 4
      },
      "date": "2026-11-20",
      "time": "12:30",
      "endTime": "16:30",
      "eligibility": "",
      "maxTeams": 30,
      "venue": {
        "kn": "TODO-CONFIRM",
        "en": "TODO-CONFIRM"
      },
      "sheetName": "TRH – Treasure Hunt",
      "deadline": "2026-11-18T23:59:00+05:30"
    },
    "s-group-singing": {
      "code": "GSG",
      "category": "students",
      "name": {
        "kn": "ಸಮೂಹ ಗಾಯನ",
        "en": "Group Singing"
      },
      "teamSize": {
        "min": 6,
        "max": 12
      },
      "date": "2026-11-20",
      "time": "12:30",
      "endTime": "16:30",
      "eligibility": "",
      "maxTeams": 0,
      "venue": {
        "kn": "ಬಿಎಸ್‌ಎನ್ ಸಭಾಂಗಣ",
        "en": "BSN Auditorium"
      },
      "sheetName": "GSG – Group Singing",
      "deadline": "2026-11-18T23:59:00+05:30"
    },
    "s-rangoli": {
      "code": "RGL",
      "category": "students",
      "name": {
        "kn": "ರಂಗೋಲಿ",
        "en": "Rangoli"
      },
      "teamSize": {
        "min": 5,
        "max": 5
      },
      "date": "2026-11-20",
      "time": "12:30",
      "endTime": "16:30",
      "eligibility": "",
      "maxTeams": 0,
      "venue": {
        "kn": "TODO-CONFIRM",
        "en": "TODO-CONFIRM"
      },
      "sheetName": "RGL – Rangoli",
      "deadline": "2026-11-18T23:59:00+05:30"
    },
    "s-elocution": {
      "code": "ELO",
      "category": "students",
      "name": {
        "kn": "ಆಶುಭಾಷಣ (ಕನ್ನಡೇತರರಿಗೆ)",
        "en": "Elocution – Pick & Speak (for non-Kannadigas)"
      },
      "teamSize": {
        "min": 1,
        "max": 1
      },
      "date": "2026-11-20",
      "time": "12:30",
      "endTime": "16:30",
      "eligibility": "nonKannadiga",
      "maxTeams": 0,
      "venue": {
        "kn": "TODO-CONFIRM",
        "en": "TODO-CONFIRM"
      },
      "sheetName": "ELO – Elocution – Pick & Speak (for non-Kannadigas)",
      "deadline": "2026-11-18T23:59:00+05:30"
    },
    "s-simple-debate": {
      "code": "SKD",
      "category": "students",
      "name": {
        "kn": "ಸರಳ ಕನ್ನಡ ವಾದ-ವಿವಾದ (ಕನ್ನಡೇತರರಿಗೆ)",
        "en": "Simple Kannada Debate (for non-Kannadigas)"
      },
      "teamSize": {
        "min": 1,
        "max": 1
      },
      "date": "2026-11-20",
      "time": "12:30",
      "endTime": "16:30",
      "eligibility": "nonKannadiga",
      "maxTeams": 0,
      "venue": {
        "kn": "TODO-CONFIRM",
        "en": "TODO-CONFIRM"
      },
      "sheetName": "SKD – Simple Kannada Debate (for non-Kannadigas)",
      "deadline": "2026-11-18T23:59:00+05:30"
    },
    "f-debate": {
      "code": "FDB",
      "category": "faculty",
      "name": {
        "kn": "ವಾದ-ವಿವಾದ (ಅಧ್ಯಾಪಕರು)",
        "en": "Faculty Debate"
      },
      "teamSize": {
        "min": 1,
        "max": 1
      },
      "date": "2026-11-20",
      "time": "12:30",
      "endTime": "16:30",
      "eligibility": "",
      "maxTeams": 0,
      "venue": {
        "kn": "ಎಸ್‌ಎಂವಿ ಬ್ಲಾಕ್ (ಅಕಾಡೆಮಿಕ್ ಬ್ಲಾಕ್), ೧ನೇ ಮಹಡಿ ಸಭಾಂಗಣ",
        "en": "SMV Block (Academic Block), 1st Floor Auditorium"
      },
      "sheetName": "FDB – Faculty Debate",
      "deadline": "2026-11-18T23:59:00+05:30"
    },
    "f-group-dance": {
      "code": "FGD",
      "category": "faculty",
      "name": {
        "kn": "ಸಾಮೂಹಿಕ ನೃತ್ಯ (ಅಧ್ಯಾಪಕರು)",
        "en": "Faculty Group Dance"
      },
      "teamSize": {
        "min": 4,
        "max": 12
      },
      "date": "2026-11-20",
      "time": "12:30",
      "endTime": "16:30",
      "eligibility": "",
      "maxTeams": 0,
      "venue": {
        "kn": "ಎಸ್‌ಜೆಬಿ ೫ನೇ ಮಹಡಿ, ಆಂಫಿಥಿಯೇಟರ್",
        "en": "SJB 5th Floor Amphitheatre"
      },
      "sheetName": "FGD – Faculty Group Dance",
      "deadline": "2026-11-18T23:59:00+05:30"
    },
    "f-group-singing": {
      "code": "FGS",
      "category": "faculty",
      "name": {
        "kn": "ಸಮೂಹ ಗಾಯನ (ಅಧ್ಯಾಪಕರು)",
        "en": "Faculty Group Singing"
      },
      "teamSize": {
        "min": 6,
        "max": 12
      },
      "date": "2026-11-20",
      "time": "12:30",
      "endTime": "16:30",
      "eligibility": "",
      "maxTeams": 0,
      "venue": {
        "kn": "ಬಿಎಸ್‌ಎನ್ ಸಭಾಂಗಣ",
        "en": "BSN Auditorium"
      },
      "sheetName": "FGS – Faculty Group Singing",
      "deadline": "2026-11-18T23:59:00+05:30"
    }
  }
};
