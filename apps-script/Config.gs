// ============================================================================
// GENERATED FILE — do not edit by hand.
// Source: src/data/site.json, src/data/events.json, src/lib/rules.ts
// Regenerate with `npm run gas:config` (also runs on every build), then paste
// the new contents into the Config.gs file of the Apps Script project and
// redeploy (see apps-script/README.md, "Updating the script").
// ============================================================================

var CONFIG = {
  "minFormMs": 3000,
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
      "time": "TODO-CONFIRM",
      "venue": {
        "kn": "TODO-CONFIRM",
        "en": "TODO-CONFIRM"
      },
      "seats": 100,
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
      "time": "TODO-CONFIRM",
      "venue": {
        "kn": "TODO-CONFIRM",
        "en": "TODO-CONFIRM"
      },
      "seats": 100,
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
      "time": "TODO-CONFIRM",
      "venue": {
        "kn": "TODO-CONFIRM",
        "en": "TODO-CONFIRM"
      },
      "seats": 100,
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
      "time": "TODO-CONFIRM",
      "venue": {
        "kn": "TODO-CONFIRM",
        "en": "TODO-CONFIRM"
      },
      "seats": 100,
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
        "min": 2,
        "max": 2
      },
      "date": "2026-11-20",
      "time": "TODO-CONFIRM",
      "venue": {
        "kn": "TODO-CONFIRM",
        "en": "TODO-CONFIRM"
      },
      "seats": 30,
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
        "min": 6,
        "max": 12
      },
      "date": "2026-11-20",
      "time": "TODO-CONFIRM",
      "venue": {
        "kn": "TODO-CONFIRM",
        "en": "TODO-CONFIRM"
      },
      "seats": 30,
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
        "min": 3,
        "max": 4
      },
      "date": "2026-11-20",
      "time": "TODO-CONFIRM",
      "venue": {
        "kn": "TODO-CONFIRM",
        "en": "TODO-CONFIRM"
      },
      "seats": 30,
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
        "min": 3,
        "max": 8
      },
      "date": "2026-11-20",
      "time": "TODO-CONFIRM",
      "venue": {
        "kn": "TODO-CONFIRM",
        "en": "TODO-CONFIRM"
      },
      "seats": 30,
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
        "min": 2,
        "max": 4
      },
      "date": "2026-11-20",
      "time": "TODO-CONFIRM",
      "venue": {
        "kn": "TODO-CONFIRM",
        "en": "TODO-CONFIRM"
      },
      "seats": 30,
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
      "time": "TODO-CONFIRM",
      "venue": {
        "kn": "TODO-CONFIRM",
        "en": "TODO-CONFIRM"
      },
      "seats": 100,
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
        "max": 10
      },
      "date": "2026-11-20",
      "time": "TODO-CONFIRM",
      "venue": {
        "kn": "TODO-CONFIRM",
        "en": "TODO-CONFIRM"
      },
      "seats": 30,
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
        "min": 3,
        "max": 8
      },
      "date": "2026-11-20",
      "time": "TODO-CONFIRM",
      "venue": {
        "kn": "TODO-CONFIRM",
        "en": "TODO-CONFIRM"
      },
      "seats": 30,
      "deadline": "2026-11-18T23:59:00+05:30"
    }
  }
};
