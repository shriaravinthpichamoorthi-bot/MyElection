let _cache = null;

export async function loadData() {
  if (_cache) return _cache;
  const res = await fetch('/output.json');
  const raw = await res.json();
  _cache = processData(raw);
  return _cache;
}

// Pre-2008 delimitation: constituency_no → district (using 2026 district names)
// 2001 & 2006 used the old delimitation; numbering completely differs from 2011+
const PRE2008_NO_TO_DISTRICT = {
  // Chennai (1–14, 18)
  1:'Chennai', 2:'Chennai', 3:'Chennai', 4:'Chennai', 5:'Chennai',
  6:'Chennai', 7:'Chennai', 8:'Chennai', 9:'Chennai', 10:'Chennai',
  11:'Chennai', 12:'Chennai', 13:'Chennai', 14:'Chennai', 18:'Chennai',
  // Thiruvallur (15–17, 28–31)
  15:'Thiruvallur', 16:'Thiruvallur', 17:'Thiruvallur',
  28:'Thiruvallur', 29:'Thiruvallur', 30:'Thiruvallur', 31:'Thiruvallur',
  // Chengalpattu (19–24)
  19:'Chengalpattu', 20:'Chengalpattu', 21:'Chengalpattu',
  22:'Chengalpattu', 23:'Chengalpattu', 24:'Chengalpattu',
  // Kancheepuram (25–27)
  25:'Kancheepuram', 26:'Kancheepuram', 27:'Kancheepuram',
  // Ranipet (32–34, 38)
  32:'Ranipet', 33:'Ranipet', 34:'Ranipet', 38:'Ranipet',
  // Vellore (35–37, 47–48)
  35:'Vellore', 36:'Vellore', 37:'Vellore', 47:'Vellore', 48:'Vellore',
  // Tirupathur (39–41)
  39:'Tirupathur', 40:'Tirupathur', 41:'Tirupathur',
  // Tiruvannamalai (42–46, 49–51)
  42:'Tiruvannamalai', 43:'Tiruvannamalai', 44:'Tiruvannamalai',
  45:'Tiruvannamalai', 46:'Tiruvannamalai',
  49:'Tiruvannamalai', 50:'Tiruvannamalai', 51:'Tiruvannamalai',
  // Viluppuram (52–60, 71)
  52:'Viluppuram', 53:'Viluppuram', 54:'Viluppuram', 55:'Viluppuram',
  56:'Viluppuram', 57:'Viluppuram', 58:'Viluppuram', 59:'Viluppuram',
  60:'Viluppuram', 71:'Viluppuram',
  // Kallakurichi (61–62 border, 70, 72–73)
  61:'Kallakurichi', 70:'Kallakurichi', 72:'Kallakurichi', 73:'Kallakurichi',
  // Cuddalore (62–69)
  62:'Cuddalore', 63:'Cuddalore', 64:'Cuddalore', 65:'Cuddalore',
  66:'Cuddalore', 67:'Cuddalore', 68:'Cuddalore', 69:'Cuddalore',
  // Krishnagiri (74–78)
  74:'Krishnagiri', 75:'Krishnagiri', 76:'Krishnagiri',
  77:'Krishnagiri', 78:'Krishnagiri',
  // Dharmapuri (79–83)
  79:'Dharmapuri', 80:'Dharmapuri', 81:'Dharmapuri',
  82:'Dharmapuri', 83:'Dharmapuri',
  // Salem (84–93, 99–100)
  84:'Salem', 85:'Salem', 86:'Salem', 87:'Salem', 88:'Salem',
  89:'Salem', 90:'Salem', 91:'Salem', 92:'Salem', 93:'Salem',
  99:'Salem', 100:'Salem',
  // Namakkal (94–98)
  94:'Namakkal', 95:'Namakkal', 96:'Namakkal', 97:'Namakkal', 98:'Namakkal',
  // Coimbatore (101, 103–110)
  101:'Coimbatore', 103:'Coimbatore', 104:'Coimbatore', 105:'Coimbatore',
  106:'Coimbatore', 107:'Coimbatore', 108:'Coimbatore', 109:'Coimbatore', 110:'Coimbatore',
  // Tiruppur (102, 111–117)
  102:'Tiruppur', 111:'Tiruppur', 112:'Tiruppur', 113:'Tiruppur',
  114:'Tiruppur', 115:'Tiruppur', 116:'Tiruppur', 117:'Tiruppur',
  // Erode (118–125)
  118:'Erode', 119:'Erode', 120:'Erode', 121:'Erode',
  122:'Erode', 123:'Erode', 124:'Erode', 125:'Erode',
  // The Nilgiris (126–128)
  126:'The Nilgiris', 127:'The Nilgiris', 128:'The Nilgiris',
  // Dindigul (129–130, 139, 147–150)
  129:'Dindigul', 130:'Dindigul', 139:'Dindigul',
  147:'Dindigul', 148:'Dindigul', 149:'Dindigul', 150:'Dindigul',
  // Theni (131–135)
  131:'Theni', 132:'Theni', 133:'Theni', 134:'Theni', 135:'Theni',
  // Madurai (136–138, 140–146)
  136:'Madurai', 137:'Madurai', 138:'Madurai',
  140:'Madurai', 141:'Madurai', 142:'Madurai', 143:'Madurai',
  144:'Madurai', 145:'Madurai', 146:'Madurai',
  // Karur (151–153, 155)
  151:'Karur', 152:'Karur', 153:'Karur', 155:'Karur',
  // Tiruchirappalli (154, 156–159, 161, 165–168)
  154:'Tiruchirappalli', 156:'Tiruchirappalli', 157:'Tiruchirappalli',
  158:'Tiruchirappalli', 159:'Tiruchirappalli', 161:'Tiruchirappalli',
  165:'Tiruchirappalli', 166:'Tiruchirappalli', 167:'Tiruchirappalli', 168:'Tiruchirappalli',
  // Perambalur (160)
  160:'Perambalur',
  // Ariyalur (162–164)
  162:'Ariyalur', 163:'Ariyalur', 164:'Ariyalur',
  // Mayiladuthurai (169–172, 188)
  169:'Mayiladuthurai', 170:'Mayiladuthurai', 171:'Mayiladuthurai',
  172:'Mayiladuthurai', 188:'Mayiladuthurai',
  // Thiruvarur (173–174, 177–178)
  173:'Thiruvarur', 174:'Thiruvarur', 177:'Thiruvarur', 178:'Thiruvarur',
  // Nagapattinam (175–176)
  175:'Nagapattinam', 176:'Nagapattinam',
  // Thanjavur (179–187)
  179:'Thanjavur', 180:'Thanjavur', 181:'Thanjavur', 182:'Thanjavur',
  183:'Thanjavur', 184:'Thanjavur', 185:'Thanjavur', 186:'Thanjavur', 187:'Thanjavur',
  // Pudukkottai (189–193)
  189:'Pudukkottai', 190:'Pudukkottai', 191:'Pudukkottai',
  192:'Pudukkottai', 193:'Pudukkottai',
  // Sivaganga (194–195, 197–199)
  194:'Sivaganga', 195:'Sivaganga', 197:'Sivaganga', 198:'Sivaganga', 199:'Sivaganga',
  // Ramanathapuram (196, 200–203)
  196:'Ramanathapuram', 200:'Ramanathapuram', 201:'Ramanathapuram',
  202:'Ramanathapuram', 203:'Ramanathapuram',
  // Virudhunagar (204–209)
  204:'Virudhunagar', 205:'Virudhunagar', 206:'Virudhunagar',
  207:'Virudhunagar', 208:'Virudhunagar', 209:'Virudhunagar',
  // Thoothukudi (210–212, 224–227)
  210:'Thoothukudi', 211:'Thoothukudi', 212:'Thoothukudi',
  224:'Thoothukudi', 225:'Thoothukudi', 226:'Thoothukudi', 227:'Thoothukudi',
  // Tenkasi (213–217)
  213:'Tenkasi', 214:'Tenkasi', 215:'Tenkasi', 216:'Tenkasi', 217:'Tenkasi',
  // Tirunelveli (218–223)
  218:'Tirunelveli', 219:'Tirunelveli', 220:'Tirunelveli',
  221:'Tirunelveli', 222:'Tirunelveli', 223:'Tirunelveli',
  // Kanniyakumari (228–234)
  228:'Kanniyakumari', 229:'Kanniyakumari', 230:'Kanniyakumari',
  231:'Kanniyakumari', 232:'Kanniyakumari', 233:'Kanniyakumari', 234:'Kanniyakumari',
};

function processData(raw) {
  const cd = raw.constituency_data;

  // Step 1: Build 2026 constituency_no → district map (post-2008 delimitation reference)
  const post2008NoToDistrict = {};
  cd.filter(r => r.year === 2026).forEach(r => {
    post2008NoToDistrict[r.constituency_no] = r.district;
  });

  // Step 2: Inject district into every record
  cd.forEach(r => {
    if (r.district) return; // already has it (2026)
    if (r.year >= 2011) {
      r.district = post2008NoToDistrict[r.constituency_no] || null;
    } else {
      r.district = PRE2008_NO_TO_DISTRICT[r.constituency_no] || null;
    }
  });

  // Step 3: Compute missing margin_pct (2016 and 2021 have margin but no margin_pct)
  cd.forEach(r => {
    if (r.margin_pct == null && r.margin != null && r.votes_polled) {
      r.margin_pct = +((r.margin / r.votes_polled) * 100).toFixed(2);
    }
    // Also compute winner_vote_pct if missing
    if (r.winner_vote_pct == null && r.winner_votes != null && r.votes_polled) {
      r.winner_vote_pct = +((r.winner_votes / r.votes_polled) * 100).toFixed(2);
    }
  });

  const years = [...new Set(cd.map(r => r.year))].sort();
  const constituencies = [...new Set(cd.map(r => r.name))].sort();
  const districts = [...new Set(cd.map(r => r.district).filter(Boolean))].sort();

  // Party normalization
  const PARTY_NORM = { 'ADMK': 'AIADMK', 'AIADMK': 'AIADMK' };
  const normParty = p => PARTY_NORM[p] || p;

  // Index by constituency name
  const byConstituency = {};
  cd.forEach(r => {
    if (!byConstituency[r.name]) byConstituency[r.name] = [];
    byConstituency[r.name].push(r);
  });

  // Index by district+year
  const byDistrictYear = {};
  cd.forEach(r => {
    if (!r.district) return;
    const key = `${r.district}||${r.year}`;
    if (!byDistrictYear[key]) byDistrictYear[key] = [];
    byDistrictYear[key].push(r);
  });

  // Index by year
  const byYear = {};
  years.forEach(y => { byYear[y] = cd.filter(r => r.year === y); });

  // Swing analysis
  const swingData = {};
  constituencies.forEach(name => {
    const hist = (byConstituency[name] || []).sort((a, b) => a.year - b.year);
    const swings = [];
    for (let i = 1; i < hist.length; i++) {
      const prev = hist[i - 1];
      const curr = hist[i];
      if (!prev.winner_vote_pct || !curr.winner_vote_pct) continue;
      swings.push({
        from: prev.year, to: curr.year,
        prevParty: normParty(prev.winner_party),
        currParty: normParty(curr.winner_party),
        partyChange: normParty(prev.winner_party) !== normParty(curr.winner_party),
        marginChange: (curr.margin_pct || 0) - (prev.margin_pct || 0),
        turnoutChange: (curr.turnout_pct || 0) - (prev.turnout_pct || 0),
      });
    }
    swingData[name] = swings;
  });

  // Incumbency
  const incumbencyData = {};
  constituencies.forEach(name => {
    const hist = (byConstituency[name] || []).sort((a, b) => a.year - b.year);
    let streak = 0, streakParty = null;
    const records = [];
    hist.forEach(r => {
      const party = r.winner_party ? normParty(r.winner_party) : null;
      if (party === null) {
        // No result yet (e.g. 2026 pending) — don't break the streak, just record
        records.push({ year: r.year, party: null, streak, isIncumbent: streak > 1 });
        return;
      }
      if (party === streakParty) streak++;
      else { streak = 1; streakParty = party; }
      records.push({ year: r.year, party, streak, isIncumbent: streak > 1 });
    });
    incumbencyData[name] = records;
  });

  // Strongholds: 2+ consecutive wins by same party — use last record WITH a known party
  const strongholds = {};
  constituencies.forEach(name => {
    const recs = (incumbencyData[name] || []).filter(r => r.party);
    if (!recs.length) return;
    const maxStreak = Math.max(0, ...recs.map(r => r.streak));
    const dominant = recs[recs.length - 1];
    if (maxStreak >= 2 && dominant) {
      strongholds[name] = { party: dominant.party, streak: maxStreak };
    }
  });

  function classifyMargin(pct) {
    if (!pct) return 'unknown';
    if (pct < 3) return 'toss-up';
    if (pct < 8) return 'battleground';
    return 'safe';
  }

  // Party performance by year
  const partyPerf = {};
  years.forEach(y => {
    const recs = byYear[y] || [];
    const perf = {};
    recs.forEach(r => {
      if (!r.winner_party) return;
      const p = normParty(r.winner_party);
      if (!perf[p]) perf[p] = { seats: 0, totalVotes: 0 };
      perf[p].seats++;
    });
    recs.forEach(r => {
      (r.candidates || []).forEach(c => {
        const p = normParty(c.party);
        if (!perf[p]) perf[p] = { seats: 0, totalVotes: 0 };
        perf[p].totalVotes += c.votes || 0;
      });
    });
    partyPerf[y] = perf;
  });

  // Alliance performance by year
  const alliancePerf = {};
  years.forEach(y => {
    const recs = byYear[y] || [];
    const perf = {};
    recs.forEach(r => {
      if (!r.winner_alliance) return;
      perf[r.winner_alliance] = (perf[r.winner_alliance] || 0) + 1;
    });
    alliancePerf[y] = perf;
  });

  // Women stats by year
  const womenStats = {};
  years.forEach(y => {
    const recs = byYear[y] || [];
    let totalCandidates = 0, femaleCandidates = 0, femaleWinners = 0;
    recs.forEach(r => {
      (r.candidates || []).forEach(c => {
        totalCandidates++;
        if (c.sex === 'F') femaleCandidates++;
      });
      const winner = (r.candidates || []).find(c => c.rank === 1);
      if (winner && winner.sex === 'F') femaleWinners++;
    });
    womenStats[y] = { totalCandidates, femaleCandidates, femaleWinners, seats: recs.length };
  });

  // Canonical lookup key: strips dots/commas, sorts all tokens alphabetically
  // so "M.K. Stalin", "Stalin M.K.", "Stalin.M.K" all map to the same key
  function normalizeName(name) {
    return name
      .toLowerCase()
      .replace(/[.,]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .filter(Boolean)
      .sort()
      .join(' ');
  }

  // Display name: strips dots/commas, puts single-letter initials first then full words
  // "Stalin M.K." → "M K Stalin", "M.K. Stalin" → "M K Stalin"
  function normalizeDisplayName(name) {
    const tokens = name
      .replace(/[.,]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .filter(Boolean);
    const initials = tokens.filter(t => t.length === 1).map(t => t.toUpperCase());
    const words = tokens.filter(t => t.length > 1).map(t => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());
    return [...initials, ...words].join(' ');
  }

  // Candidate index
  // Pass 1: find normalized names that appear in 2+ constituencies in the same year
  // — these are different people with the same name and must NOT be merged
  const yearNameToConstits = {};
  cd.forEach(r => {
    (r.candidates || []).forEach(c => {
      if (!c.name || c.party === 'NOTA' || c.name.trim().toUpperCase() === 'NOTA') return;
      const nkey = normalizeName(c.name);
      const ykey = `${r.year}::${nkey}`;
      if (!yearNameToConstits[ykey]) yearNameToConstits[ykey] = new Set();
      yearNameToConstits[ykey].add(r.name);
    });
  });
  const ambiguousNames = new Set();
  Object.entries(yearNameToConstits).forEach(([ykey, constits]) => {
    if (constits.size > 1) {
      ambiguousNames.add(ykey.split('::').slice(1).join('::'));
    }
  });

  // Pass 2: build candidateMap
  // — ambiguous names use normalizedName+constituency as key (track per constituency)
  // — unique names use just normalizedName (track across all elections for one person)
  const candidateMap = {};
  cd.forEach(r => {
    (r.candidates || []).forEach(c => {
      if (!c.name || c.party === 'NOTA' || c.name.trim().toUpperCase() === 'NOTA') return;
      const nkey = normalizeName(c.name);
      const key = ambiguousNames.has(nkey) ? `${nkey}::${r.name.toLowerCase()}` : nkey;
      if (!candidateMap[key]) {
        candidateMap[key] = { name: normalizeDisplayName(c.name), party: c.party, sex: c.sex, contests: [] };
      }
      candidateMap[key].contests.push({
        year: r.year, constituency: r.name, district: r.district,
        rank: c.rank, votes: c.votes, vote_pct: c.vote_pct,
        alliance: c.alliance, party: c.party,
        won: c.rank === 1, margin: c.rank === 1 ? r.margin : null,
      });
    });
  });

  // Fix stateSummary constituency counts (raw data has stale counts for some years)
  const stateSummary = (raw.state_summary || []).map(s => ({
    ...s,
    constituencies: (byYear[s.year] || []).length || s.constituencies,
  }));

  // Top battleground seats (2021)
  const battlegrounds = (byYear[2021] || [])
    .filter(r => r.margin_pct != null)
    .sort((a, b) => a.margin_pct - b.margin_pct)
    .slice(0, 20)
    .map(r => ({ ...r, classification: classifyMargin(r.margin_pct) }));

  return {
    raw, cd, years, constituencies, districts,
    byConstituency, byDistrictYear, byYear,
    swingData, incumbencyData, strongholds, classifyMargin,
    partyPerf, alliancePerf, womenStats, candidateMap, battlegrounds,
    normParty,
    partyColors: raw.party_colors || {},
    allianceColors: raw.alliance_colors || {},
    stateSummary,
    district2026: raw.district_2026 || [],
    alliances: raw.alliances || {},
    predictions: raw.predictions || {},
  };
}
