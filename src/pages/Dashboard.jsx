import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import MapComponent from "../components/MapComponent";
import MyCafesGuide from "../components/MyCafesGuide";
import { useSavedLists } from "../hooks/useSavedLists";
import { useCafeNotes } from "../hooks/useCafeNotes";
import { usePermission } from "../hooks/usePermission";
import { useAuth } from "../context/AuthContext";
import "./PageShared.css";

export default function Dashboard() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const { lists, allCafes, createList, deleteList, removeCafeFromList } = useSavedLists(user?.username);

  const [openId,        setOpenId]        = useState(null);
  const [newName,       setNewName]       = useState("");
  const [editingNoteId, setEditingNoteId] = useState(null); // which café note is open for editing
  const [savedNoteId,   setSavedNoteId]   = useState(null); // which café just showed ✓ Saved

  const { permission, grant, deny } = usePermission(user?.username);
  const { getNote, setNote }        = useCafeNotes(user?.username);

  // members only
  useEffect(() => {
    if (!user) navigate("/login");
  }, [user, navigate]);

  if (!user) return null;

  const handleCreate = (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    createList(newName.trim());
    setNewName("");
  };

  const favoritesId = lists[0]?.id;
  const isDenied    = permission === "denied";

  const noteKey = (cafe) => `${cafe.Name}__${cafe.Address}`;

  const handleSaveNote = (cafe) => {
    const key = noteKey(cafe);
    // Collapse the editor and flash ✓ Saved briefly
    setEditingNoteId(null);
    setSavedNoteId(key);
    setTimeout(() => setSavedNoteId((cur) => (cur === key ? null : cur)), 2000);
  };

  return (
    <div className="page-shell">
      <Navbar />

      {/* Guide — shows on first visit (perm slide) or after granting (feature steps) */}
      <MyCafesGuide
        username={user.username}
        permission={permission}
        onGrant={grant}
        onDeny={deny}
      />

      <div className="dash-wrapper">

        {/* ── Permission wall — shown when user declined ─────────────────── */}
        {isDenied && (
          <div className="dash-perm-wall">
            <div className="dash-perm-card">
              <span className="dash-perm-emoji">🔒</span>
              <h3 className="dash-perm-title">Your favourites are just one step away</h3>
              <p className="dash-perm-body">
                To save cafés and keep personal notes, we need your permission to
                store a small bit of data on your device. We only ever save your
                café list and your notes — nothing else, and never shared with anyone.
              </p>
              <p className="dash-perm-reassure">
                You're always welcome to browse the map freely. We just want to
                make sure you feel genuinely comfortable before we save anything. ☕
              </p>
              <div className="dash-perm-actions">
                <button className="dash-perm-btn dash-perm-btn--primary" onClick={grant}>
                  I agree, let's go →
                </button>
                <button
                  className="dash-perm-btn dash-perm-btn--ghost"
                  onClick={() => navigate("/")}
                >
                  No thanks, take me to the map
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Main dashboard content (blurred when denied) ──────────────── */}
        <div className={`dash-content${isDenied ? " dash-content--blurred" : ""}`}>
          <div className="page-badge">My Cafés</div>
          <h1 className="page-title">
            {(() => {
              const raw  = user.preferredName || user.username || "";
              const name = raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : "";
              return name ? `${name}'s Saved Lists ☕` : "Your Saved Lists ☕";
            })()}
          </h1>

          <div className="dash-layout">
            {/* Left — lists */}
            <div className="dash-lists">
              {lists.map((list) => {
                const isFavorites = list.id === favoritesId;
                const isOpen      = isFavorites || openId === list.id;

                return (
                  <div key={list.id} className={`dash-list ${isOpen ? "is-open" : ""}`}>
                    <button
                      className="dash-list-head"
                      onClick={() => {
                        if (!isFavorites) setOpenId(openId === list.id ? null : list.id);
                      }}
                    >
                      <div className="dash-list-thumb">
                        <span>📷</span>
                        <small>TBD</small>
                      </div>
                      <div className="dash-list-info">
                        <span className="dash-list-name">{list.name}</span>
                        <span className="dash-list-count">
                          {list.cafes.length} {list.cafes.length === 1 ? "café" : "cafés"} saved
                        </span>
                      </div>
                      {!isFavorites && <span className="dash-list-chevron">⌄</span>}
                    </button>

                    {isOpen && (
                      <div className="dash-list-body">
                        {list.cafes.length === 0 ? (
                          <p className="dash-list-empty">Nothing here yet — go save some spots!</p>
                        ) : (
                          list.cafes.map((cafe, i) => {
                            const key      = noteKey(cafe);
                            const hasNote  = !!getNote(cafe).trim();
                            const isEditing = editingNoteId === key || !hasNote;
                            const justSaved = savedNoteId === key;

                            return (
                              <div key={`${cafe.Name}-${i}`} className="dash-cafe-row">
                                {/* Café name + action buttons */}
                                <div className="dash-cafe-top">
                                  <div className="dash-cafe-text">
                                    <p className="saved-cafe-name">{cafe.Name}</p>
                                    <p className="saved-cafe-neighborhood">{cafe.Address}</p>
                                  </div>
                                  <div className="dash-cafe-actions">
                                    <button
                                      className={`dash-note-edit-btn${hasNote && !isEditing ? " has-note" : ""}`}
                                      onClick={() => setEditingNoteId(isEditing ? null : key)}
                                      title={hasNote ? "Edit note" : "Add a note"}
                                    >
                                      📝
                                    </button>
                                    <a
                                      className="saved-cafe-directions"
                                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(cafe.Address)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      title="Directions"
                                    >
                                      🧭
                                    </a>
                                    <button
                                      className="saved-cafe-remove"
                                      onClick={() => removeCafeFromList(list.id, cafe)}
                                      title="Remove from list"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>

                                {/* ── Note section ─────────────────────────── */}
                                {isEditing ? (
                                  /* Edit mode — textarea + save button */
                                  <>
                                    <textarea
                                      className="dash-cafe-note"
                                      placeholder="✏️  Add a personal note about this spot..."
                                      value={getNote(cafe)}
                                      onChange={(e) => setNote(cafe, e.target.value)}
                                      rows={2}
                                      autoFocus={hasNote} /* focus when re-opening existing note */
                                    />
                                    <button
                                      className="dash-note-save"
                                      onClick={() => handleSaveNote(cafe)}
                                    >
                                      Save note
                                    </button>
                                  </>
                                ) : (
                                  /* Collapsed mode — note preview only */
                                  <div className="dash-note-collapsed">
                                    <p className="dash-note-preview">
                                      {justSaved
                                        ? <span className="dash-note-saved-flash">✓ Saved!</span>
                                        : getNote(cafe).length > 90
                                          ? `${getNote(cafe).slice(0, 90)}…`
                                          : getNote(cafe)
                                      }
                                    </p>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                        {!isFavorites && lists.length > 1 && (
                          <button
                            className="dash-list-delete"
                            onClick={() => deleteList(list.id)}
                          >
                            Delete this list
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              <form className="dash-new-list" onSubmit={handleCreate}>
                <input
                  type="text"
                  placeholder="New list name..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <button type="submit">+ Create</button>
              </form>
            </div>

            {/* Right — map of all saved cafés */}
            <div className="dash-map">
              {allCafes.length === 0 ? (
                <div className="empty-saved dash-map-empty">
                  <p className="page-body">You haven't saved any cafés yet.</p>
                  <button className="empty-saved-cta" onClick={() => navigate("/")}>
                    Explore the map →
                  </button>
                </div>
              ) : (
                <MapComponent cafes={allCafes} />
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
