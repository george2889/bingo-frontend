import { useEffect, useRef, useState } from "react"
import { findLocation, findSortingRule, getBinLabel, getBinSummary, getSourceUrl, sortingItems, supportedCities, type SortingItem } from "./data/sortingRules"

type Screen =
  | "signin"
  | "create"
  | "location"
  | "ready"
  | "home"
  | "lookup"
  | "guide"
  | "scanner"
  | "camera"
  | "review"
  | "result"
  | "learn"
  | "profile"
  | "facility"
  | "journey"

const bottlePhoto =
  "https://images.unsplash.com/photo-1629227071576-e91767cc3024?auto=format&fit=crop&w=900&q=85"
const recyclePhoto =
  "https://images.unsplash.com/photo-1595278069441-2cf29f8005a4?auto=format&fit=crop&w=1200&q=85"
const kitchenPhoto =
  "https://images.unsplash.com/photo-1631724451488-d441475d6f6c?auto=format&fit=crop&w=1200&q=85"
const facilityPhoto =
  "https://images.unsplash.com/photo-1763315156830-07870b159121?auto=format&fit=crop&w=1200&q=85"
const flakesPhoto =
  "https://www.reiling.de/sites/default/files/styles/full_hd/public/field_media_image/pet_flakes_klar_nah_0.jpg?h=fa1c963e&itok=RG7nVKnx"

function Logo() {
  return <div className="logo"><span>♻</span> loop</div>
}

function Top({ title, back, menu = true, className = "" }: { title?: string; back?: () => void; menu?: boolean; className?: string }) {
  return (
    <header className={`top ${className}`}>
      {back ? <button className="icon" onClick={back} aria-label="Go back">←</button> : <Logo />}
      {title && <strong>{title}</strong>}
      {menu ? <button className="icon" aria-label="Menu">•••</button> : <span />}
    </header>
  )
}

function Button({ children, onClick, light = false, disabled = false }: { children: React.ReactNode; onClick?: () => void; light?: boolean; disabled?: boolean }) {
  return <button className={`primary ${light ? "light" : ""}`} onClick={onClick} disabled={disabled}>{children}</button>
}

function PasswordToggle({ visible, onClick }: { visible: boolean; onClick: () => void }) {
  return <button className="eye-toggle" type="button" onClick={onClick} aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible}>
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" />
      {visible ? <circle cx="12" cy="12" r="2.7" /> : <path d="M4 4 20 20" />}
    </svg>
  </button>
}

function Nav({ active, go, onScan }: { active: string; go: (s: Screen) => void; onScan: () => void }) {
  return (
    <nav className="nav">
      <button className={active === "home" ? "active" : ""} onClick={() => go("home")}><span>⌂</span>Home</button>
      <button className={active === "scan" ? "active" : ""} onClick={onScan}><span>⌗</span>Scanner</button>
      <button className={active === "learn" ? "active" : ""} onClick={() => go("learn")}><span>♧</span>Learn</button>
      <button className={active === "profile" ? "active" : ""} onClick={() => go("profile")}><span>♙</span>Profile</button>
    </nav>
  )
}

function Field({ label, value, type = "text" }: { label: string; value: string; type?: string }) {
  return <label className="field">{label}<input value={value} type={type} readOnly /></label>
}

function App() {
  const [screen, setScreen] = useState<Screen>("signin")
  const [history, setHistory] = useState<Screen[]>([])
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [cameraError, setCameraError] = useState("")
  const [photoPreview, setPhotoPreview] = useState("")
  const [city, setCity] = useState("Lafayette, California")
  const [homeType, setHomeType] = useState("")
  const [signInId, setSignInId] = useState("maya.green")
  const [firstName, setFirstName] = useState("Maya")
  const [username, setUsername] = useState("maya.green")
  const [email, setEmail] = useState("maya@example.com")
  const [password, setPassword] = useState("password123")
  const [showPassword, setShowPassword] = useState(false)
  const [displayName, setDisplayName] = useState("Maya")
  const [profileSaved, setProfileSaved] = useState(false)
  const [lookupItemValue, setLookupItemValue] = useState("")
  const [lookupSearch, setLookupSearch] = useState("")
  const [lookupOpen, setLookupOpen] = useState(false)
  const [activeLookupIndex, setActiveLookupIndex] = useState(0)
  const isPasswordValid = password.length >= 8 && /\d/.test(password)
  const signIn = () => {
    const id = signInId.trim()
    const matchesAccount = id.toLowerCase() === username.trim().toLowerCase() || id.toLowerCase() === email.trim().toLowerCase()
    setDisplayName(matchesAccount && firstName.trim() ? firstName.trim() : id.split("@")[0])
    if (matchesAccount) setSignInId(username.trim())
    go("home")
  }
  const createAccount = () => {
    if (!isPasswordValid) return
    setDisplayName(firstName.trim() || username.trim())
    setSignInId(username.trim())
    go("location")
  }
  const cityName = city.split(",")[0].trim()
  const cityLabel = `${cityName}, CA`
  const locationDetails = findLocation(city)
  const facilityName = locationDetails?.facility_name ?? `${cityName} waste service`
  const isBerkeley = cityName.toLowerCase() === "berkeley"
  const [hasSeenPhotoGuide, setHasSeenPhotoGuide] = useState(() => {
    try { return window.localStorage.getItem("loop-photo-guide-completed-v2") === "true" } catch { return false }
  })
  const [hasSeenScannerAccess, setHasSeenScannerAccess] = useState(() => {
    try { return window.localStorage.getItem("loop-scanner-access-completed-v2") === "true" } catch { return false }
  })
  const cameraVideo = useRef<HTMLVideoElement>(null)
  const photoPicker = useRef<HTMLInputElement>(null)
  const go = (next: Screen) => { setHistory((h) => [...h, screen]); setShowPassword(false); setScreen(next); window.scrollTo(0, 0) }
  const back = () => { const next = history.at(-1); if (next) { setShowPassword(false); setScreen(next); setHistory((h) => h.slice(0, -1)) } }
  const openCamera = async () => {
    setCameraError("")
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera access isn’t available in this browser. Try opening this page in a browser that supports camera access.")
      if (screen !== "camera") go("camera")
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })
      setCameraStream(stream)
      go("camera")
    } catch (error) {
      setCameraStream(null)
      setCameraError(error instanceof DOMException && error.name === "NotAllowedError"
        ? "Camera access was blocked. Allow camera access in your browser settings, then try again."
        : "We couldn’t open your camera. Check that it’s available and try again.")
      if (screen !== "camera") go("camera")
    }
  }
  const enterScanner = () => {
    if (!hasSeenPhotoGuide) { go("guide"); return }
    if (hasSeenScannerAccess) { void openCamera(); return }
    go("scanner")
  }
  const completeScannerAccess = () => {
    setHasSeenScannerAccess(true)
    try { window.localStorage.setItem("loop-scanner-access-completed-v2", "true") } catch { /* Keep the scanner flow working when storage is unavailable. */ }
  }
  const choosePhotoFromLibrary = () => {
    completeScannerAccess()
    const picker = photoPicker.current
    if (!picker) return
    try {
      picker.showPicker()
    } catch {
      picker.click()
    }
  }
  const openPhotoLibrary = () => {
    const picker = photoPicker.current
    if (!picker) return
    try { picker.showPicker() } catch { picker.click() }
  }
  const continueFromPhotoGuide = () => {
    setHasSeenPhotoGuide(true)
    try { window.localStorage.setItem("loop-photo-guide-completed-v2", "true") } catch { /* Keep the scanner flow working when storage is unavailable. */ }
    go("scanner")
  }
  const choosePhoto = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    if (!file) return
    setPhotoPreview(URL.createObjectURL(file))
    go("review")
  }
  const capturePhoto = () => {
    const video = cameraVideo.current
    if (video && video.videoWidth > 0 && video.videoHeight > 0) {
      const canvas = document.createElement("canvas")
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height)
      setPhotoPreview(canvas.toDataURL("image/jpeg", 0.92))
    }
    go("review")
  }

  useEffect(() => {
    if (screen === "camera" && cameraVideo.current && cameraStream) cameraVideo.current.srcObject = cameraStream
    if (screen !== "camera" && cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop())
      setCameraStream(null)
    }
  }, [screen, cameraStream])

  const shell = (content: React.ReactNode, nav?: "home" | "scan" | "learn" | "profile") => (
    <main className="app">{content}<input ref={photoPicker} className="photo-picker-input" type="file" accept="image/*" onChange={choosePhoto} aria-label="Choose a photo from your library" />{nav && <Nav active={nav} go={go} onScan={enterScanner} />}</main>
  )

  if (screen === "signin") return shell(<>
    <header className="top signin-top"><Logo /><strong>YOUR EVERYDAY SORTING GUIDE</strong></header>
    <section className="content auth">
      <div className="pill">♧ &nbsp; A small act. A better loop.</div>
      <h1>Welcome back to a<br />greener everyday.</h1>
      <p>Sign in for sorting advice that starts with where you live.</p>
      <label className="field signin-field">Email or username<div className="input-wrap"><input value={signInId} onChange={(e) => setSignInId(e.target.value)} /><span aria-hidden="true">♙</span></div></label>
      <label className="field signin-field">Password<div className="input-wrap"><input value={password} onChange={(e) => setPassword(e.target.value)} type={showPassword ? "text" : "password"} /><PasswordToggle visible={showPassword} onClick={() => setShowPassword((visible) => !visible)} /></div></label>
      <a className="forgot">Forgot password?</a>
      <Button onClick={signIn}>→ &nbsp; Sign in</Button>
      <p className="center">New to loop? <button className="link" onClick={() => go("create")}>Create an account</button></p>
    </section>
    <div className="privacy"><span>♧</span><p>Your photos help identify items. Your personal<br className="privacy-break" /> details stay yours.</p></div>
    <div className="home-indicator" />
  </>)

  if (screen === "create") return shell(<>
    <header className="top create-top"><button className="icon" onClick={back} aria-label="Go back">←</button><strong>CREATE ACCOUNT</strong><span>01 / 03</span></header>
    <section className="content create-content"><h1>Good habits start with<br />you.</h1><p>A few details, then we’ll find your local sorting guide.</p>
      <label className="field create-field">First name<div className="input-wrap"><input value={firstName} onChange={(e) => setFirstName(e.target.value)} /></div></label>
      <label className="field create-field">Username<div className="input-wrap"><input value={username} onChange={(e) => setUsername(e.target.value)} /><span>☉</span></div></label>
      <label className="field create-field">Email address<div className="input-wrap"><input value={email} onChange={(e) => setEmail(e.target.value)} /></div></label>
      <label className="field create-field">Password<div className="input-wrap"><input value={password} onChange={(e) => setPassword(e.target.value)} type={showPassword ? "text" : "password"} /><PasswordToggle visible={showPassword} onClick={() => setShowPassword((visible) => !visible)} /></div></label>
      <p className={`password-hint ${isPasswordValid ? "valid" : "invalid"}`} role="status">{isPasswordValid ? "Password meets the requirements." : "Use at least 8 characters and include a number."}</p>
      <div className="terms"><span>✓</span><p>I agree to the Terms of use and Privacy policy.</p></div>
      <Button onClick={createAccount} disabled={!isPasswordValid}>→ &nbsp; Create account</Button>
      <p className="create-signin">Already have an account? <button onClick={() => go("signin")}>Sign in</button></p>
    </section>
    <div className="home-indicator" />
  </>)

  if (screen === "location") return shell(<>
    <header className="top step-top"><button className="icon" onClick={back} aria-label="Go back">←</button><strong>YOUR LOCAL GUIDE</strong><span>02 / 03</span></header>
    <section className="content location-content"><div className="pill">♧ &nbsp; Sorting starts locally</div><h1>Where do you call<br />home?</h1><p>The same item can go in different bins in different places. Let’s match your guide.</p>
      <label className="field location-field">Country<div className="input-wrap"><input value="United States" readOnly /></div></label>
      <label className="field location-field">City or community<div className="input-wrap"><select value={city} onChange={(e) => { setCity(e.target.value); setHomeType("") }}>
        {supportedCities.map((option) => <option key={option}>{option}</option>)}
      </select><span>⌄</span></div></label>
      {isBerkeley && <label className="field location-field">What type of home do you live in?<div className="input-wrap"><select value={homeType} onChange={(e) => setHomeType(e.target.value)}>
        <option value="" disabled>Select your home type</option>
        <option value="single-family">Single-family home</option>
        <option value="duplex">Duplex</option>
        <option value="up-to-9-units">Building with up to 9 units</option>
      </select><span>⌄</span></div></label>}
      {isBerkeley && !homeType && <p className="location-type-hint">Select a home type to load the matching Berkeley rules.</p>}
      <div className="community-card"><div><strong>{cityLabel}</strong><span>✓</span></div><p>Local curbside collection guide<br />Rules matched to your selected city</p></div>
      <div className="location-privacy"><span>♧</span><p>City-level only. We don’t need your street address or precise location.</p></div>
      <Button onClick={() => go("ready")} disabled={isBerkeley && !homeType}>→ &nbsp; Use {cityName} guidelines</Button>
      <p className="location-disclaimer">Rules are matched to the selected local program. Confirm current details with your service provider.</p>
    </section>
    <div className="home-indicator" />
  </>)

  if (screen === "ready") return shell(<>
    <header className="top step-top ready-top"><button className="icon" onClick={back} aria-label="Go back">←</button><strong>YOU’RE ALL SET</strong><span>03 / 03</span></header>
    <section className="content ready-content"><img className="hero ready-hero" src={kitchenPhoto} alt="A person sorting a bottle for recycling at home" /><div className="pill">♧ &nbsp; {cityLabel} · local guide</div>
      <h1>Welcome, {displayName}. Let’s<br />close the loop.</h1><p>Your local guide is ready. Turn “which bin?” into one small, confident decision.</p>
      <div className="ready-confirm"><span>✓</span><div><strong>Made local for @{username.trim()}</strong><small>Change your community anytime.</small></div></div>
      <Button onClick={() => go("home")}>→ &nbsp; Show me around</Button>
      <p className="ready-disclaimer">Your local guide is ready. Confirm current requirements with your service provider before sorting.</p>
    </section>
    <div className="home-indicator" />
  </>)

  if (screen === "home") return shell(<><header className="top scanner-top"><Logo /></header>
    <section className="content scanner-home"><div className="pill">♧ &nbsp; {cityLabel} · local guide</div><h1>Hi, {displayName}.</h1><p>A little clarity for your next small act.</p>
      <button className="scan-card" onClick={enterScanner}><span>⌗</span><div><strong>Not sure which bin?</strong><small>Take a photo. Get a local answer.</small></div><b>▣ &nbsp; Scan an item</b></button>
      <button className="lookup-home-button" onClick={() => go("lookup")}>⌕ &nbsp; Look Up an Item</button>
      <h3>Three small steps</h3><div className="steps scanner-steps"><span><b>1</b><strong>Photograph</strong><small>One item at a time</small></span><span><b>2</b><strong>Check</strong><small>Confirm the item</small></span><span><b>3</b><strong>Sort</strong><small>Follow your guide</small></span></div>
      <div className="photo-heading"><h3>A good photo helps</h3></div>
      <div className="photo-grid scanner-photos"><div><img src={bottlePhoto} alt="One clear bottle, shown by itself" /><strong className="photo-good">ⓥ &nbsp; One clear item</strong></div><div><img src={recyclePhoto} alt="Cluttered items that are hard to identify" /><strong className="photo-bad">ⓧ &nbsp; Clutter or cut-off</strong></div></div>
      <p className="photo-copy">For a bottle: show the whole item, from cap to base. If asked, turn it over and photograph the material symbol on the bottom.</p>
      <button className="choice row next-row" onClick={() => go("learn")}><span>☷ &nbsp; Where does it go next?<small>　　 Meet the people and process.</small></span>↗</button>
      <p className="disclaimer">Rules are matched to your city. Confirm current requirements with your local service provider.</p>
    </section></>, "home")

  if (screen === "lookup") {
    const selectedItem = sortingItems.find((item) => item.example === lookupItemValue)
    const filteredItems = sortingItems.filter((item) => `${item.example} ${item.material} ${item.item_class}`.toLowerCase().includes(lookupSearch.trim().toLowerCase()))
    const locationMatch = selectedItem ? findSortingRule(selectedItem.item_class, city, homeType) : undefined
    const selectedRule = locationMatch?.rule
    const lookupLocation = locationMatch?.location ?? findLocation(city)
    const sourceUrl = lookupLocation ? getSourceUrl(selectedRule, lookupLocation) : ""
    const chooseLookupItem = (item: SortingItem) => {
      setLookupItemValue(item.example)
      setLookupSearch("")
      setLookupOpen(false)
      setActiveLookupIndex(0)
    }
    return shell(<><Top title="LOOK UP AN ITEM" back={back} menu={false} />
      <section className="content lookup-content"><div className="pill">♧ &nbsp; {cityLabel} · local guide</div><h1>Look up an item.</h1><p>Choose an item to see how your local program sorts it. No camera needed.</p>
        <label className="field lookup-field">What would you like to sort?<div className="lookup-picker">
          <input type="search" role="combobox" aria-label="Choose or search for an item" aria-autocomplete="list" aria-expanded={lookupOpen} aria-controls="lookup-item-options" aria-activedescendant={lookupOpen && filteredItems[activeLookupIndex] ? `lookup-option-${activeLookupIndex}` : undefined}
            placeholder="Choose or search for an item" value={lookupOpen ? lookupSearch : selectedItem?.example ?? ""}
            onFocus={() => { setLookupSearch(selectedItem?.example ?? ""); setLookupOpen(true); setActiveLookupIndex(0) }} onBlur={() => { window.setTimeout(() => setLookupOpen(false), 120) }}
            onChange={(e) => { setLookupSearch(e.target.value); setLookupItemValue(""); setLookupOpen(true); setActiveLookupIndex(0) }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" && filteredItems.length) { e.preventDefault(); setLookupOpen(true); setActiveLookupIndex((index) => Math.min(index + 1, filteredItems.length - 1)) }
              if (e.key === "ArrowUp") { e.preventDefault(); setActiveLookupIndex((index) => Math.max(index - 1, 0)) }
              if (e.key === "Enter" && lookupOpen && filteredItems[activeLookupIndex]) { e.preventDefault(); chooseLookupItem(filteredItems[activeLookupIndex]) }
              if (e.key === "Escape") setLookupOpen(false)
            }} />
          <span aria-hidden="true">⌕</span>
          {lookupOpen && <div className="lookup-options" id="lookup-item-options" role="listbox">
            {filteredItems.length ? filteredItems.map((item, index) => <button id={`lookup-option-${index}`} className={index === activeLookupIndex ? "highlighted" : ""} type="button" tabIndex={-1} role="option" aria-selected={index === activeLookupIndex} key={item.example} onClick={() => chooseLookupItem(item)}>
              <strong>{item.example}</strong><small>{item.material} · {item.item_class}</small>
            </button>) : <p className="lookup-no-results">No matching items. Try another search.</p>}
          </div>}
        </div></label>
        {selectedItem && selectedRule && <div className={`lookup-result lookup-${selectedRule.bin}`}>
          <small>{getBinLabel(selectedRule.bin).toUpperCase()} · {selectedItem.item_class}</small>
          <h2>{getBinLabel(selectedRule.bin)}</h2>
          <p>{selectedRule.bin === "needs_verification" ? getBinSummary(selectedRule.bin) : selectedRule.prep_instructions || getBinSummary(selectedRule.bin)}</p>
          {selectedRule.bin === "needs_verification" && selectedRule.prep_instructions && <p className="lookup-rule-caution">Verify: {selectedRule.prep_instructions}</p>}
          {sourceUrl && <><a href={sourceUrl} target="_blank" rel="noreferrer">View local sorting source ↗</a><small className="lookup-checked">Checked {selectedRule.date_checked}</small></>}
        </div>}
        {selectedItem && !selectedRule && <div className="lookup-result lookup-needs_verification"><small>LOCATION DETAILS NEEDED</small><h2>Choose your home type</h2><p>Berkeley rules in this guide apply to single-family homes, duplexes, and buildings with up to 9 units. Set your home type in Your local guide or Profile.</p></div>}
        <p className="lookup-disclaimer">Check the linked local source for the latest rules and exceptions.</p>
      </section></>, "home")
  }

  if (screen === "guide") return shell(<><Top title="PHOTO GUIDE" back={back} />
    <section className="content photo-guide-content"><h1>Show us the right<br />details.</h1><p>Start with the whole bottle. Keep the cap and base inside the outline.</p>
      <div className="guide-photo"><img src={bottlePhoto} alt="Whole bottle framed from cap to base" /><div className="frame" /><span className="frame-label cap-label">Cap in view</span><span className="frame-label base-label">Base in view</span></div>
      <div className="closeup-card"><img src={bottlePhoto} alt="Look for the bottle material mark" /><span><strong>Need a closer look?</strong><small>If prompted, photograph the PET mark on the underside—not the barcode.</small></span></div>
      <div className="photo-tips"><span>☼ &nbsp; Use soft light</span><span>⌗ &nbsp; Keep it sharp</span></div>
      <Button onClick={continueFromPhotoGuide}>▣ &nbsp; Got it, open scanner</Button>
    </section></>, "scan")

  if (screen === "scanner") return shell(<><Top title="SCANNER" back={back} className="scanner-access-top" />
    <section className="content scanner-access-content">
      <div className="access-preview"><img src={bottlePhoto} alt="Bottle framed in the scanner" /><div className="access-frame" /><span className="access-camera-icon">▣</span></div>
      <h1>A photo is worth a<br />clearer answer.</h1>
      <p>Allow camera access to identify an item and see how to sort it in your community.</p>
      <div className="access-points"><span>▣ &nbsp; Only when you’re using the scanner.</span><span>♧ &nbsp; You choose which photo to submit.</span></div>
      {cameraError && <p className="camera-error">{cameraError}</p>}
      <Button onClick={() => { completeScannerAccess(); void openCamera() }}>▣ &nbsp; Allow camera access</Button>
      <button className="photo-picker-button" onClick={choosePhotoFromLibrary}>▧ &nbsp; Not now · use a photo instead</button>
    </section></>, "scan")

  if (screen === "camera") return shell(<div className="camera">
    <header className="camera-top"><button onClick={back} aria-label="Close scanner">×</button><strong>Scan an item</strong><span aria-hidden="true" /></header>
    <div className="camera-view">{cameraStream ? <video ref={cameraVideo} autoPlay playsInline muted aria-label="Live camera preview" /> : <div className="camera-placeholder">{cameraError || "Allow camera access to scan an item."}<button className="camera-retry" onClick={openCamera}>Enable camera</button></div>}
      {cameraStream && <><div className="scan-frame" /><div className="guide-tag">♧ &nbsp; {cityName} · local guidelines</div></>}
    </div>
    <div className="camera-controls">{!cameraStream && <><h2>Camera access needed</h2><p>Your browser will ask for permission to use the camera.</p></>}
      {cameraStream ? <div className="camera-tools"><button onClick={openPhotoLibrary} aria-label="Open photo library"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="4" width="17" height="16" rx="2" /><circle cx="15.8" cy="8.2" r="1.4" /><path d="m5 17 5.2-5.4 3.4 3.4 2.1-2 3.3 4" /></svg></button><button className="shutter" onClick={capturePhoto} aria-label="Take photo" /></div> : null}
    </div>
  </div>, "scan")

  if (screen === "review") return shell(<><Top title="PHOTO REVIEW" back={back} menu={false} />
    <section className="content review-content"><h1>Happy with this<br />photo?</h1><p>Make sure the item is sharp and fully in view before we find its sorting guide.</p>
      <img className="hero tall" src={photoPreview || bottlePhoto} alt="Captured plastic bottle" />
      <div className="tags"><span>✓ One item</span><span>✓ Cap + base visible</span></div>
      <Button onClick={() => go("result")}>→ &nbsp; Yes, find my sorting guide</Button><Button light onClick={openCamera}>◯ &nbsp; Retake photo</Button>
      <p className="review-privacy">♧ &nbsp; Only this photo will be used to identify your item. No background camera recording.</p>
    </section></>, "scan")

  if (screen === "result") {
    const bottleExample = sortingItems.find((item) => item.example === "Plastic water bottle")
    const ruleMatch = bottleExample ? findSortingRule(bottleExample.item_class, city, homeType) : undefined
    const rule = ruleMatch?.rule
    const sourceUrl = ruleMatch ? getSourceUrl(rule, ruleMatch.location) : ""
    const prepSteps = rule?.prep_instructions.split(";").map((step) => step.trim()).filter(Boolean) ?? []
    const binIcon = rule?.bin === "recycling" ? "♻" : rule?.bin === "compost" ? "♧" : rule?.bin === "special_disposal" ? "⚠" : "↓"
    return shell(<><Top title="YOUR SORTING GUIDE" back={back} menu={false} />
      <section className="content result-content"><div className="pill">♧ &nbsp; {cityLabel} · local sorting rule</div>
        <div className="item-card result-item"><img src={photoPreview || bottlePhoto} alt="Your photographed plastic water bottle" /><div><small>{bottleExample?.material.toUpperCase()} · {bottleExample?.item_class}</small><h2>{bottleExample?.example}</h2><p>Photo guide example item.</p></div></div>
        {rule ? <div className={`result result-${rule.bin}`}><small>{rule.bin === "needs_verification" ? "CHECK BEFORE SORTING" : `SORT AS ${getBinLabel(rule.bin).toUpperCase()}`}</small><h1><span>{binIcon}</span> {getBinLabel(rule.bin)}</h1><p>{getBinSummary(rule.bin)}</p></div> : <div className="result result-needs_verification"><small>LOCATION DETAILS NEEDED</small><h1>Choose a home type</h1><p>Select a Berkeley home type in Your local guide or Profile to get its matching rules.</p></div>}
        <h3>{rule?.bin === "needs_verification" ? "What to check" : "Preparation"}</h3>
        {prepSteps.length > 0 ? prepSteps.map((step, index) => <div className="sorting-rule" key={`${index}-${step}`}><b>{index + 1}</b><span><strong>{step}</strong></span></div>) : <p className="rule-empty">{rule?.bin === "needs_verification" ? getBinSummary("needs_verification") : "No item-specific preparation steps are listed in this rule."}</p>}
        {sourceUrl && rule && <div className="result-citation"><a className="result-source" href={sourceUrl} target="_blank" rel="noreferrer">View local sorting source ↗</a><small>Checked {rule.date_checked}</small></div>}
        <Button onClick={() => go("learn")}>☷ &nbsp; See where this bottle goes</Button>
        <Button light onClick={() => { void openCamera() }}>⌗ &nbsp; Scan another item</Button>
        <p className="result-disclaimer">Rule matched for {cityLabel}. Check the linked local source for current details.</p>
      </section></>, "scan")
  }

  if (screen === "learn") return shell(<><header className="top scanner-top"><Logo /><strong>LEARN</strong></header>
    <section className="content learn-content"><div className="pill">♧ &nbsp; {cityName} · local collection</div><h1>Your bin is just the beginning.</h1><p>Meet the local services and facilities connected to your sorting guide.</p>
      <button className="learn-feature" onClick={() => go("facility")}><img src={facilityPhoto} alt="Illustrative recycling recovery facility" /><div className="learn-feature-body"><span className="facility-tag">▧ &nbsp; Listed local provider</span><div className="feature-title"><h2>{facilityName}</h2><span>↗</span></div><p>Provider listed for {cityName}. Open for local service and facility information.</p></div></button>
      <h3>A system in motion</h3><div className="stats learn-stats"><span><b>1,800</b>tonnes / month</span><span><b>82%</b>material recovered</span><span><b>6</b>material streams</span></div>
      <p className="learn-figure-note">Illustrative figures only · not live facility data.</p>
      <button className="next-facility" onClick={() => go("facility")}><span>⟳</span><div><strong>Circular PET Works</strong><small>Next stop · washing and reprocessing<br />plastic bottles</small></div><b>›</b></button>
      <p className="learn-disclaimer">All facilities and statistics in this demo are fictional examples, not verified local listings.</p>
    </section></>, "learn")

  if (screen === "profile") return shell(<><header className="top scanner-top"><Logo /><strong>PROFILE</strong></header>
    <section className="content profile-content"><div className="pill">Your account details</div><h1>Your profile</h1><p>Update your account and local guide information.</p>
      <div className="profile-avatar">{(firstName.trim()[0] || username.trim()[0] || "M").toUpperCase()}</div>
      <label className="field profile-field">Name<div className="input-wrap"><input value={firstName} onChange={(e) => { setFirstName(e.target.value); setProfileSaved(false) }} autoComplete="name" /></div></label>
      <label className="field profile-field">Username<div className="input-wrap"><input value={username} onChange={(e) => { setUsername(e.target.value); setProfileSaved(false) }} autoComplete="username" /></div></label>
      <label className="field profile-field">Email address<div className="input-wrap"><input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setProfileSaved(false) }} autoComplete="email" /></div></label>
      <label className="field profile-field">Password<div className="input-wrap"><input type={showPassword ? "text" : "password"} value={password} onChange={(e) => { setPassword(e.target.value); setProfileSaved(false) }} autoComplete="new-password" /><PasswordToggle visible={showPassword} onClick={() => setShowPassword((visible) => !visible)} /></div></label>
      <h3>Local guide</h3>
      <label className="field profile-field">Country<div className="input-wrap"><input value="United States" readOnly autoComplete="country-name" /></div></label>
      <label className="field profile-field">City or community<div className="input-wrap"><select value={city} onChange={(e) => { setCity(e.target.value); setHomeType(""); setProfileSaved(false) }}>
        {supportedCities.map((option) => <option key={option}>{option}</option>)}
      </select></div></label>
      {isBerkeley && <label className="field profile-field">Home type<div className="input-wrap"><select value={homeType} onChange={(e) => { setHomeType(e.target.value); setProfileSaved(false) }}>
        <option value="" disabled>Select your home type</option><option value="single-family">Single-family home</option><option value="duplex">Duplex</option><option value="up-to-9-units">Building with up to 9 units</option>
      </select></div></label>}
      {profileSaved && <p className="profile-saved">✓ &nbsp; Profile changes saved</p>}
      <Button onClick={() => { setDisplayName(firstName.trim() || username.trim() || "Maya"); setSignInId(username.trim()); setProfileSaved(true) }}>Save changes</Button>
    </section></>, "profile")

  if (screen === "facility") return shell(<><Top title="FACILITY SPOTLIGHT" back={back} menu={false} />
    <section className="content"><img className="hero" src={facilityPhoto} alt="Illustrative materials recovery facility" /><div className="pill">Provider from your local guide</div><h1>{facilityName}</h1><p>This provider is listed for {cityName}. Check its website for current services and facility details.</p>
      {locationDetails?.facility_url && <a className="provider-link" href={locationDetails.facility_url} target="_blank" rel="noreferrer">Visit provider website ↗</a>}
      <div className="choice"><strong>{cityLabel}</strong><small>Location matched from your local guide.</small></div><h3>Typical recovery steps</h3><p className="facility-process-note">Illustrative process only; the linked provider can confirm its actual facilities and services.</p>
      {["Arrive & separate", "Find & check", "Bale & send out"].map((x, i) => <div className="rule" key={x}><b>{i + 1}</b><span>{x}</span></div>)}
      <Button onClick={() => go("journey")}>⌘ &nbsp; Follow your bottle's journey</Button>
    </section></>, "learn")

  return shell(<><Top title="MATERIAL JOURNEY" back={back} menu={false} />
    <section className="content journey-content"><div className="pill">♻ &nbsp; Plastic water bottle · {cityLabel}</div><h1>One bottle. Another<br />beginning.</h1><p>Here’s one possible path after your bottle leaves curbside recycling.</p>
      <div className="journey-hero"><img src={flakesPhoto} alt="Clean, shredded PET plastic flakes" /><span>From bottle to clean PET flakes</span></div>
      <div className="journey-timeline">
        <div><b>♻</b><span><strong>Your recycling bin</strong><em>{displayName}’s home · {cityName}</em><small>Empty, cap on, and loose. A small step that helps keep the stream clean.</small></span></div>
        <div><b>▧</b><span><strong>Sorted into a PET bale</strong><em>{facilityName}</em><small>PET bottles are separated from other materials, checked and pressed together.</small></span></div>
        <div><b>♨</b><span><strong>Washed into clean flakes</strong><em>Circular PET Works</em><small>Bottles are shredded and washed. Caps are separated into their own material stream.</small></span></div>
        <div><b>✧</b><span><strong>Ready for another life</strong><em>A new manufacturing loop</em><small>Flakes can become pellets for new packaging or fibres, depending on quality and demand.</small></span></div>
      </div>
      <div className="journey-note"><strong>The best loop starts with less.</strong><p>Refill and reuse when you can. Recycling helps recover material, but not every item becomes a new bottle.</p></div>
      <Button onClick={enterScanner}>⌗ &nbsp; Ready for the next small act? Scan</Button>
      <p className="journey-disclaimer">Illustrative journey, facilities and outcomes. Actual destinations depend on local collection systems and material markets.</p>
    </section></>, "learn")
}

export default App
