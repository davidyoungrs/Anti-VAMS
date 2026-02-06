/**
 * Logic for API 598 / ISO 5208 Valve Testing Standards
 */

export const standardsService = {
    /**
     * Calculate required test pressures and durations.
     * @param {string|number} size - Valve size in inches (e.g. "2", "2.5", "10")
     * @param {string|number} rating - Class (150, 300...) or MAWP/CWP in PSI.
     * @param {string} type - 'gate', 'globe', 'check', 'ball', 'butterfly', etc. (Optional for future refinement)
     * @returns {object} Calculated parameters
     */
    calculate: (size, rating, type = 'generic') => {
        const result = {
            shell: { pressure: 0, duration: 0, unit: 'PSI' },
            seatHP: { pressure: 0, duration: 0, unit: 'PSI' }, // High Pressure Liquid
            seatLP: { pressure: 80, duration: 0, unit: 'PSI' }, // Low Pressure Gas (Air)
            notes: []
        };

        // Parse Size
        const s = parseFloat(size);
        if (isNaN(s)) {
            result.notes.push("Invalid Size");
            return result;
        }

        // Parse Rating (Class or PSI)
        // Heuristic: If < 5000 and ends with 00 or 50, might be class? 
        // 150, 300, 400, 600, 900, 1500, 2500, 4500 are standard classes.
        // But MAWP could be anything.
        // Let's assume input is strings like "150#", "Class 150", or just "150".
        let cwp = 0; // Cold Working Pressure
        const rStr = String(rating).toUpperCase();
        let isClass = false;

        // Common API 600/ASME B16.34 CWP values (Approx for Carbon Steel Group 1.1)
        // Users can override if they have special material.
        const classMap = {
            '150': 285,
            '300': 740,
            '600': 1480,
            '800': 1975, // API 602
            '900': 2220,
            '1500': 3705,
            '2500': 6170
        };

        // Try to match Class
        if (rStr.includes('150')) { cwp = classMap['150']; isClass = true; }
        else if (rStr.includes('300')) { cwp = classMap['300']; isClass = true; }
        else if (rStr.includes('600')) { cwp = classMap['600']; isClass = true; }
        else if (rStr.includes('800')) { cwp = classMap['800']; isClass = true; }
        else if (rStr.includes('900')) { cwp = classMap['900']; isClass = true; }
        else if (rStr.includes('1500')) { cwp = classMap['1500']; isClass = true; }
        else if (rStr.includes('2500')) { cwp = classMap['2500']; isClass = true; }
        else {
            // Assume input is already PSI (MAWP)
            const p = parseFloat(rating);
            if (!isNaN(p)) {
                cwp = p;
                result.notes.push("Using input as CWP/MAWP for calculation.");
            } else {
                result.notes.push("Invalid Rating/Class.");
            }
        }

        if (cwp > 0) {
            // API 598 Logic
            // Shell = 1.5 x CWP
            result.shell.pressure = Math.ceil(cwp * 1.5);

            // High Pressure Closure (Seat) = 1.1 x CWP
            result.seatHP.pressure = Math.ceil(cwp * 1.1);
        }

        // API 598 Durations (Table)
        // Shell Test Duration
        if (s <= 2) result.shell.duration = 15;
        else if (s <= 6) result.shell.duration = 60;
        else if (s <= 12) result.shell.duration = 120; // Some charts say 60 for < 6, 120 for 8+?
        // API 598-2016 Table 4:
        // <= 2: 15s
        // 2 1/2 to 6: 60s
        // 8 to 12: 120s
        // >= 14: 300s
        else result.shell.duration = 300;

        // Seat Test Duration (Closure)
        // <= 2: 15s
        // 2 1/2 to 6: 60s
        // 8 to 12: 120s
        // >= 14: 120s (Wait, Table 4 says 120 for >14 too? Or 300? usually 120 for closure)
        if (s <= 2) result.seatHP.duration = 15;
        else if (s <= 6) result.seatHP.duration = 60;
        else if (s <= 12) result.seatHP.duration = 120;
        else result.seatHP.duration = 120;

        // Low Pressure Gas Duration
        // Same as closure usually
        result.seatLP.duration = result.seatHP.duration;

        return result;
    }
};
