"""Static game content for HALCYON: Five Nights at the Aviary.

Night configs, phone calls, hidden crane notes and archive documents live here so the
server can decide what the player is allowed to see.
"""

BIRDS = {
    "raven": {
        "name": "The Raven",
        "symbol": "Memory",
        "inverted": "Omen",
        "blurb": "Built to remember Mara's stories. Now it remembers every keeper who left it in the dark.",
    },
    "eagle": {
        "name": "The Eagle",
        "symbol": "Courage",
        "inverted": "Control",
        "blurb": "Aquila Holdings' emblem. Lenses were fitted into its eyes. It watches the watchers, and it resents being watched.",
    },
    "cardinal": {
        "name": "The Cardinal",
        "symbol": "Love",
        "inverted": "Grief",
        "blurb": "A cardinal is said to be a lost one visiting. This one carries Celia Wren's lullaby. If the song ends, it comes to visit.",
    },
    "dove": {
        "name": "The Dove",
        "symbol": "Peace",
        "inverted": "Silence",
        "blurb": "Once meant forgiveness. Aquila put it on every poster: 'Peace of Mind at the Halcyon.' Be still, and it is gentle.",
    },
    "crane": {
        "name": "The Crane",
        "symbol": "Hope",
        "inverted": "The Unfinished Wish",
        "blurb": "Nine hundred and ninety-nine paper cranes sealed in its chest. It is waiting for the thousandth.",
    },
}

# Hidden from the manifest and menus until the player has seen it.
SECRET_BIRDS = {
    "owl": {
        "name": "The Owl",
        "symbol": "Wisdom",
        "inverted": "Regret",
        "blurb": "Never listed on any manifest. It wears round wire spectacles and a brass tag marked E.W. "
                 "It watches over the others, and it cannot bear to be seen.",
    },
}

# AI levels 0-20 per antagonist.
NIGHTS = {
    1: {"raven": 3, "eagle": 2, "cardinal": 1, "dove": 0, "crane": 0, "owl": 0},
    2: {"raven": 5, "eagle": 5, "cardinal": 3, "dove": 3, "crane": 2, "owl": 0},
    3: {"raven": 8, "eagle": 8, "cardinal": 5, "dove": 5, "crane": 6, "owl": 2},
    4: {"raven": 11, "eagle": 11, "cardinal": 8, "dove": 7, "crane": 9, "owl": 4},
    5: {"raven": 14, "eagle": 14, "cardinal": 10, "dove": 9, "crane": 12, "owl": 6},
    6: {"raven": 17, "eagle": 17, "cardinal": 13, "dove": 12, "crane": 16, "owl": 9},
}

# Required overtime: OT n is worked after story night n and must be survived before night n+1.
OVERTIME_TASKS = {
    1: {
        "id": "simon",
        "name": "Simon Says",
        "bird": "cardinal",
        "desc": "Maintenance needs the Cardinal's chest panel tested. Open it up and repeat every sequence the lights play.",
        "controls": "Click the buttons, or press 1-6. Four panels, longer each time.",
        "threat": "One wrong note, or too long a silence, and the Cardinal closes around you.",
        "hint": "A single mistake is fatal. Watch the whole sequence before you press anything, and don't wait more than a few seconds between presses.",
    },
    2: {
        "id": "arcade",
        "name": "Test the Arcade",
        "bird": "eagle",
        "desc": "Aquila wants the new SKY KEEPER cabinet tested before the reopening. Score over 5,500.",
        "controls": "A / D or the mouse to move. SPACE turns around and fires the flash (2 second recharge).",
        "threat": "The Eagle does not like being turned away from. It walks up behind you while you play.",
        "hint": "Listen for footsteps behind you and watch the reflection in the arcade glass. Turn around (SPACE) and flash it before it reaches you.",
    },
    3: {
        "id": "flyers",
        "name": "Print Flyers",
        "bird": "dove",
        "desc": "Print 300 reopening flyers on the old press in the basement.",
        "controls": "Hold SPACE or hold the lever to print. Release to stop.",
        "threat": "The Dove hates noise. If you hear her over the press, stop, and stay stopped until she has gone.",
        "hint": "Under the press noise there is a faint coo or flutter. Release SPACE right away and wait about five seconds. She leaves without a sound.",
    },
    4: {
        "id": "tapes",
        "name": "Review the Tapes",
        "bird": "raven",
        "desc": "Go through the night's footage. Something keeps appearing in it. Mark every sighting.",
        "controls": "Click the tape the moment eyes appear in it.",
        "threat": "The Raven remembers every sighting you miss, and every wrong mark.",
        "hint": "Eyes only show for a moment. Don't click until you see them, and expect more tapes later on.",
    },
}

WISE_CALL = (
    "Hello? Hello. You don't know this voice, and I'd rather you didn't. Listen closely. Tonight the others sleep, "
    "and only one keeps watch. It is old and patient, and it plays by rules, so here are the rules, the way it taught them to me. "
    "When the hush comes from the side where the sun goes down, shut the way it came. "
    "When it waits on the side where the sun comes up, give it a dawn before the dawn. "
    "When it presses its face to the glass, give it a wish, folded while it watches. "
    "When it hides inside your screens, send it lightning down the wire. "
    "When it stands in the room beside you, wear the face it is looking for, and do not take it off until it looks away. "
    "And mind the little song. Each turn the music box loses, its hunger doesn't grow. It multiplies. "
    "Keep her song wound, keeper. He never could stand to hear it stop."
)

MARA_NOTE = (
    "Papa,\n\n"
    "Nurse Ada says you sleep in the workshop now. She says you talk to the birds like they can hear you. "
    "I think they can. I think that's why you made them.\n\n"
    "I counted again today. 997. My hands are slow but the last ones are the best ones, I promise. "
    "If I don't get to a thousand, you have to finish them. Not for a wish. I already have my wish. "
    "It was you, sitting with me every night, pretending you weren't tired.\n\n"
    "Don't be an owl forever, Papa. Owls stay awake because they're scared of missing something. "
    "You won't miss me. I'll be in the song.\n\n"
    "Wind it up for me sometimes.\n\n"
    "- Mara (and Pip the Raven, who says hello)"
)

CALLS = {
    1: (
        "Hey. Hey, welcome to the Halcyon Aviary. Night keeper. That's you now. "
        "I worked these nights before you, so they asked me to leave a few recordings. "
        "The birds... the Songbirds... they get restless after dark. Servo-memory, the company calls it. "
        "Don't call it that around them. "
        "The Raven is the one you'll meet first. It walks the west hall. If you see it in your left doorway, shut the door. "
        "Here's a trick: it won't move while you're watching it. People say ravens remember faces. That one remembers everything. "
        "Also. The music box in the Parlor, camera seven. Keep it wound. Hold the button. Don't ask me why. Just keep the song going. "
        "Power is limited. Doors and lights and cameras eat it. Good night, keeper."
    ),
    2: (
        "Night two. Good. You came back. "
        "The Eagle sits up on the Roost, camera one. Aquila Holdings, the people who own this place, put that thing at the center of everything. "
        "Here's what nobody tells you: it hates being watched. The longer you stare at the cameras, the angrier it gets. Staring at the Roost itself is worse. "
        "When it leaves, it comes down the east hall fast. You'll hear it. Shut the right door. It'll tear at the door, and that costs power, but you'll live. "
        "And the Dove. If you lower your monitor and the room feels... calm. Warm. Quiet. Don't. Touch. Anything. "
        "Let it sit with you. Peace is a held breath. It leaves when it's satisfied."
    ),
    3: (
        "Night three. I've been reading old files. The founder, Doctor Elias Wren, built the Songbirds for his daughter. Mara. "
        "Each one meant something. The Raven was memory. The Eagle was courage. The Cardinal was love, the kind that visits after somebody's gone. "
        "The Dove was peace. And the Crane was hope. Somewhere along the way, all of it got turned around. "
        "Speaking of the Crane. It's started leaving the Wishing Pond, camera eight. Doors won't stop it. It's too patient for doors. "
        "If you see it in the window behind your desk, there's paper on the desk. Fold. Hold it until the fold is finished. "
        "It takes the crane, and it steps back. Don't ask me how I figured that out."
    ),
    4: (
        "Keeper. I don't have long. I found the room behind the Parlor. Mara's room. "
        "Strings of paper cranes. Hundreds. Hundreds and hundreds. I counted. Nine hundred and ninety-nine. She never finished. "
        "Wren put something of her into the Crane. The last one. The one she didn't fold. That's what it wants. That's what they all... "
        "No. No, I closed the... "
        "That song. It's slowing down. I forgot to wind it. Keeper, keep the song going, keep the... "
        "[a bright, terrible whistle] [static]"
    ),
    5: (
        "[Tape label: E. WREN, 1987] "
        "This is Elias Wren. If you are hearing this, Aquila kept the doors open. I am sorry. "
        "I built them to keep her company. When she was gone I couldn't let go, so I gave them her things. "
        "Her stories to the Raven. Her fear of the dark to the Eagle. Her mother's song to the Cardinal. Her forgiving to the Dove. "
        "And to the Crane I gave the only thing she ever asked me for. A wish. "
        "Nine hundred and ninety-nine cranes are in its chest. It is waiting for the last one. "
        "She hid little cranes around the aviary, with notes inside. If you find them, keep them. They are the only part of her that isn't angry. "
        "I will be watching over them. Please... don't look for me. "
        "Lock the doors. Wind the song. And please... be kind to her."
    ),
    6: (
        "Nine hundred ninety-seven. Nine hundred ninety-eight. Nine hundred... ninety-nine. "
        "Will you fold the last one?"
    ),
}

# One hidden paper crane per night (nights 1-5). Clicking it on a camera collects it.
CRANE_NOTES = {
    1: "Daddy says the birds can't really talk, but the Raven listens. I told it my secret. It promised it will never forget. - M",
    2: "The Eagle is supposed to be brave. Mr. Aquila's men put cameras in its eyes. Now it looks at everyone the way they look at it. - M",
    3: "Mom used to whistle like the red bird. Daddy put her song in the music box so it would never stop. Please don't let it stop. - M",
    4: "The white bird is for when people stop fighting. The men in suits put it on posters. They say 'peace of mind'. I think they mean 'be quiet'. - M",
    5: "999. I'm so tired. If I don't finish, will somebody finish for me? The Crane said yes. - M",
}

# Archive documents. `unlock` is the number of nights beaten required; `cranes` is
# the number of hidden notes required.
ARCHIVE = [
    {
        "id": "opening",
        "unlock": 0,
        "title": "HALCYON AVIARY OPENS ITS WINGS",
        "kind": "The Millbrook Courier - May 12, 1979",
        "body": (
            "Ornithologist-turned-inventor Dr. Elias Wren cut the ribbon Saturday on the Halcyon Aviary, a glass-domed "
            "family attraction featuring five life-size mechanical 'Songbirds'. Wren says the birds were designed with his "
            "daughter Mara, age 3, who named each one. 'They're not just machines,' Wren said. 'Each one stands for something "
            "we want her to carry with her: memory, courage, love, peace, and hope.'"
        ),
    },
    {
        "id": "manifest",
        "unlock": 0,
        "title": "SONGBIRD MANIFEST (Maintenance Copy)",
        "kind": "Internal document",
        "body": "\n".join(
            f"{b['name'].upper()} - designed as {b['symbol']}. Field note: {b['blurb']}" for b in BIRDS.values()
        ),
    },
    {
        "id": "handbook",
        "unlock": 1,
        "title": "Night Keeper Handbook, p. 14",
        "kind": "Aquila Holdings Employee Material",
        "body": (
            "Songbirds may exhibit 'servo-memory' after closing: repetitive walking, perching, or vocalizing. This is normal. "
            "Keepers must NOT attempt to deactivate the Songbirds. Keepers must NOT open the Crane's chest panel. "
            "The Parlor music box must remain wound at all times. Aquila Holdings is not responsible for injuries sustained "
            "during improper conduct."
        ),
    },
    {
        "id": "aquila",
        "unlock": 2,
        "title": "AQUILA HOLDINGS ACQUIRES HALCYON",
        "kind": "Business Ledger - Feb 3, 1984",
        "body": (
            "Following mounting medical debts, Dr. Elias Wren has sold a controlling stake in the Halcyon Aviary to Aquila "
            "Holdings. Aquila plans to 'modernize' the attraction, including a new security system integrated directly into "
            "the Eagle animatronic, which Aquila has adopted as its corporate emblem."
        ),
    },
    {
        "id": "obituary",
        "unlock": 3,
        "title": "OBITUARY: MARA ELISE WREN",
        "kind": "The Millbrook Courier - Nov 20, 1985",
        "body": (
            "Mara Elise Wren, 9, passed away peacefully on November 17 after a long illness. She is preceded in death by her "
            "mother, Celia, and survived by her father, Elias. Nurses at St. Agnes recall her folding paper cranes every day, "
            "hoping to reach one thousand. In lieu of flowers, the family asks that you fold one."
        ),
    },
    {
        "id": "quiet_night",
        "unlock": 4,
        "title": "AVIARY GUARD MISSING; AQUILA CALLS IT 'A QUIET NIGHT'",
        "kind": "The Millbrook Courier - Aug 9, 1986",
        "body": (
            "Night guard Hollis Marsh has not been seen since his shift ended Tuesday. Aquila Holdings declined to comment beyond "
            "a prepared statement: 'It was a quiet night at the Halcyon.' The company's new advertising campaign, featuring the "
            "Dove animatronic and the slogan 'Peace of Mind at the Halcyon', launched the same week."
        ),
    },
    {
        "id": "memo",
        "unlock": 5,
        "title": "MEMO: RE: E. WREN",
        "kind": "Aquila Holdings - Confidential",
        "body": (
            "Dr. Wren was last seen entering the facility after hours on March 2, 1987. His access has been revoked "
            "posthumously. Security footage from that night is to be destroyed. Under no circumstances is the Crane's chest "
            "panel to be opened. We have heard what is inside. It is counting."
        ),
    },
    {
        "id": "sixth",
        "unlock": 0,
        "owl": True,
        "title": "THE SIXTH SONGBIRD",
        "kind": "Journal of Dr. Elias Wren - final entry, March 2, 1987",
        "body": (
            "I have given each of them something of her. I have nothing left to give but myself.\n\n"
            "The Owl was always meant to be mine. Mara said it looked like me when I wore my reading glasses, "
            "so I gave it my glasses. Tonight I give it the rest.\n\n"
            "If I cannot stop them hurting anyone, I can at least watch over them. But I could not bear to be "
            "seen like this. Whoever keeps the nights after me: if you find me, look away."
        ),
    },
    {
        "id": "keeper",
        "unlock": 6,
        "title": "Night Keeper Position - Now Hiring",
        "kind": "Classified Ad",
        "body": (
            "Halcyon Aviary seeks a Night Keeper. 12AM - 6AM. Must be calm, patient, and good with your hands. "
            "Paper provided. Peace of mind guaranteed."
        ),
    },
    {
        "id": "mara_letter",
        "unlock": 0,
        "wise": True,
        "title": "A LETTER IN CRAYON",
        "kind": "Found inside the Owl's chest cavity, folded into a crane",
        "body": MARA_NOTE,
    },
]

TRUE_ENDING = (
    "You fold the last crane slowly, the way the notes taught you. The Crane lowers its long neck to the window and opens "
    "the panel in its chest. Nine hundred and ninety-nine paper cranes spill out like snow, and you place the thousandth "
    "among them.\n\nThe music box finishes its song for the first time in forty years. The Raven bows its head. The Eagle's "
    "lenses go dark. The Cardinal sings once, softly, and is quiet. The Dove does not move, and for once, it is real peace.\n\n"
    "Somewhere above the glass dome, something small and light finally flies.\n\nTHE AVIARY IS AT REST."
)

NORMAL_ENDING = (
    "6:00 AM. The doors unlock. A cheque from Aquila Holdings waits on your desk, along with a note: "
    "'Thank you for a quiet week. The Halcyon will reopen soon.'\n\nBehind you, in the dark of the Wishing Pond, "
    "something tall is still waiting.\n\nPerhaps there is more to find. (Hidden paper cranes: look closely at the cameras.)"
)

KEEPER_ENDING = (
    "6:00 AM. The doors do not unlock.\n\nThe Songbirds return to their perches, and you return to your desk. "
    "There is more paper. There is always more paper. The Halcyon needs a keeper, and now it has one.\n\n"
    "Nine hundred and ninety-nine. (Find all five of Mara's hidden cranes before facing Night 6 again.)"
)
