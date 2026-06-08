import { readFile, writeFile } from "node:fs/promises";

function requireEnv(value, name) {
  if (!value) {
    throw new Error(`${name} is required for Supabase storage.`);
  }

  return value;
}

export function createJsonStorage({ path, omitKeys = [] }) {
  return {
    name: "json",

    async load() {
      try {
        return JSON.parse(await readFile(path, "utf8"));
      } catch (error) {
        if (error.code === "ENOENT") {
          return null;
        }

        throw error;
      }
    },

    async save(state) {
      const storedState = { ...state };
      omitKeys.forEach((key) => {
        delete storedState[key];
      });

      await writeFile(path, JSON.stringify(storedState, null, 2));
    },

    async deleteMember() {
      return null;
    },
  };
}

export function createSupabaseStorage({ url, serviceRoleKey }) {
  const baseUrl = `${requireEnv(url, "SUPABASE_URL").replace(/\/$/, "")}/rest/v1`;
  const key = requireEnv(serviceRoleKey, "SUPABASE_SERVICE_ROLE_KEY");
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };

  async function request(path, options = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        ...headers,
        ...(options.headers || {}),
      },
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Supabase request failed: ${response.status} ${message}`);
    }

    if (response.status === 204) {
      return null;
    }

    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  async function list(table, query = "select=*") {
    return request(`/${table}?${query}`);
  }

  async function listWithFallback(table, primaryQuery, fallbackQuery) {
    try {
      return await list(table, primaryQuery);
    } catch (error) {
      if (!fallbackQuery) throw error;
      return list(table, fallbackQuery);
    }
  }

  function uniqueRows(rows, conflict) {
    const columns = String(conflict || "id")
      .split(",")
      .map((column) => column.trim())
      .filter(Boolean);
    const byKey = new Map();

    rows.forEach((row) => {
      const key = columns.map((column) => String(row[column] ?? "")).join("\u001f");
      byKey.set(key, row);
    });

    return [...byKey.values()];
  }

  async function upsert(table, rows, conflict = "id") {
    const unique = uniqueRows(rows, conflict);
    if (!unique.length) return;

    await request(`/${table}?on_conflict=${conflict}`, {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(unique),
    });
  }

  async function deleteAll(table, column = "id") {
    await request(`/${table}?${column}=not.is.null`, {
      method: "DELETE",
      headers: {
        Prefer: "return=minimal",
      },
    });
  }

  async function deleteMemberRow(memberId) {
    if (!memberId) return;

    await request(`/members?id=eq.${encodeURIComponent(memberId)}`, {
      method: "DELETE",
      headers: {
        Prefer: "return=minimal",
      },
    });
  }

  function normalizeMatchDate(match) {
    const datePart = String(match.id || "").slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : new Date().toISOString().slice(0, 10);
  }

  function buildApplications(matches) {
    return matches.flatMap((match) =>
      (match.applications || []).map((application) => ({
        id: `${match.id}:${application.memberId}`,
        match_id: match.id,
        member_id: application.memberId,
        paid: Boolean(application.paid),
        payment_status: application.paymentStatus || "payment_pending",
        cancelled: Boolean(application.cancelled),
      })),
    );
  }

  function buildResults(matches) {
    return matches
      .filter((match) => match.result)
      .map((match) => ({
        match_id: match.id,
        winner_id: match.result.winnerId,
        loser_id: match.result.loserId,
      }));
  }

  function buildNotificationLogs(matches) {
    return matches.flatMap((match) =>
      (match.notificationLog || []).map((messageKey) => ({
        id: `${match.id}:${messageKey}`,
        match_id: match.id,
        message_key: messageKey,
      })),
    );
  }

  return {
    name: "supabase",

    async load() {
      const [members, games, matches, applications, results, notificationLogs, events] = await Promise.all([
        listWithFallback(
          "members",
          "select=id,nickname,real_name,birth_date,phone,area,password_hash,wins,losses",
          "select=id,nickname,phone,area,password_hash,wins,losses",
        ),
        listWithFallback(
          "games",
          "select=id,title,summary,rules,win_condition,category,is_hidden",
          "select=id,title,summary,rules,win_condition",
        ),
        listWithFallback(
          "matches",
          "select=id,display_date,match_date,match_time,location,game_id,game_revealed,exact_venue,admin_note&order=match_date.asc,match_time.asc",
          "select=id,display_date,match_date,match_time,location,game_id,game_revealed&order=match_date.asc,match_time.asc",
        ),
        list("applications", "select=match_id,member_id,paid,payment_status,cancelled"),
        list("match_results", "select=match_id,winner_id,loser_id"),
        list("notification_logs", "select=match_id,message_key"),
        list("event_logs", "select=message,created_at&order=created_at.desc&limit=50"),
      ]);

      if (!members.length && !games.length && !matches.length) {
        return null;
      }

      return {
        currentUserId: null,
        members: members.map((member) => ({
          id: member.id,
          nickname: member.nickname,
          realName: member.real_name || "",
          birthDate: member.birth_date || "",
          phone: member.phone,
          area: member.area,
          passwordHash: member.password_hash,
          wins: member.wins,
          losses: member.losses,
        })),
        games: games.map((game) => ({
          id: game.id,
          title: game.title,
          summary: game.summary,
          category: game.category || "uncategorized",
          hidden: Boolean(game.is_hidden),
          rules: game.rules || [],
          win: game.win_condition,
        })),
        matches: matches.map((match) => {
          const result = results.find((item) => item.match_id === match.id);

          return {
            id: match.id,
            date: match.display_date,
            time: String(match.match_time).slice(0, 5),
            location: match.location,
            gameId: match.game_id,
            gameRevealed: match.game_revealed,
            exactVenue: match.exact_venue || "",
            adminNote: match.admin_note || "",
            applications: applications
              .filter((application) => application.match_id === match.id)
              .map((application) => ({
                memberId: application.member_id,
                paid: application.paid,
                paymentStatus: application.payment_status,
                cancelled: application.cancelled,
              })),
            result: result ? { winnerId: result.winner_id, loserId: result.loser_id } : null,
            notificationLog: notificationLogs.filter((item) => item.match_id === match.id).map((item) => item.message_key),
          };
        }),
        events: events.map((event) => ({
          message: event.message,
          createdAt: event.created_at,
        })),
      };
    },

    async save(state) {
      const matches = state.matches || [];
      const memberRows = (state.members || []).map((member) => ({
        id: member.id,
        nickname: member.nickname,
        real_name: member.realName || null,
        birth_date: member.birthDate || null,
        phone: member.phone,
        area: member.area,
        password_hash: member.passwordHash || null,
        wins: member.wins,
        losses: member.losses,
      }));

      try {
        await upsert("members", memberRows);
      } catch (error) {
        await upsert(
          "members",
          memberRows.map(({ real_name, birth_date, ...member }) => member),
        );
      }

      const gameRows = (state.games || []).map((game) => ({
        id: game.id,
        title: game.title,
        summary: game.summary,
        category: game.category || "uncategorized",
        is_hidden: Boolean(game.hidden),
        rules: game.rules || [],
        win_condition: game.win,
      }));

      try {
        await upsert("games", gameRows);
      } catch (error) {
        await upsert(
          "games",
          gameRows.map(({ category, is_hidden, ...game }) => game),
        );
      }

      const matchRows = matches.map((match) => ({
        id: match.id,
        match_date: normalizeMatchDate(match),
        display_date: match.date,
        match_time: match.time,
        location: match.location,
        game_id: match.gameId,
        game_revealed: Boolean(match.gameRevealed),
        exact_venue: match.exactVenue || "",
        admin_note: match.adminNote || "",
      }));

      try {
        await upsert("matches", matchRows);
      } catch (error) {
        await upsert(
          "matches",
          matchRows.map(({ admin_note, exact_venue, ...match }) => match),
        );
      }

      await deleteAll("notification_logs");
      await deleteAll("match_results", "match_id");
      await deleteAll("applications");
      await deleteAll("event_logs");

      await upsert("applications", buildApplications(matches));
      await upsert("match_results", buildResults(matches), "match_id");
      await upsert("notification_logs", buildNotificationLogs(matches));
      await upsert(
        "event_logs",
        (state.events || []).map((event, index) => {
          const entry = typeof event === "string" ? { message: event, createdAt: null } : event;
          return {
          id: `event-${String(index).padStart(4, "0")}`,
          message: entry.message,
          created_at: entry.createdAt || new Date().toISOString(),
        };
        }),
      );
    },

    async deleteMember(memberId) {
      await deleteMemberRow(memberId);
    },
  };
}

export function createStorage({ driver, jsonPath }) {
  if (!driver || driver === "json") {
    return createJsonStorage({ path: jsonPath, omitKeys: ["isAdmin"] });
  }

  if (driver === "supabase") {
    return createSupabaseStorage({
      url: process.env.SUPABASE_URL,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    });
  }

  throw new Error(`Unknown storage driver: ${driver}`);
}
