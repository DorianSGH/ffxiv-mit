"""
Seed the database with FFXIV jobs, abilities, and preset encounters.
Run: docker compose exec backend python -m app.seed
"""
import asyncio
from sqlalchemy import select
from app.db.session import AsyncSessionLocal, Base, engine
from app.models.models import Ability, BossAction, Encounter, Job

SEED_JOBS = [
    {
        "name": "Paladin", "abbreviation": "PLD", "role": "tank", "color": "#aaddff",
        "abilities": [
            {"name": "Divine Veil", "duration": 30, "cooldown": 90, "ability_type": "shield",
             "description": "Applies a barrier to all nearby party members."},
            {"name": "Passage of Arms", "duration": 18, "cooldown": 120, "ability_type": "mitigation",
             "description": "Reduces damage by 15% for party members behind you."},
            {"name": "Reprisal", "duration": 10, "cooldown": 60, "ability_type": "mitigation",
             "description": "Reduces damage dealt by nearby enemies by 10%."},
            {"name": "Cover", "duration": 12, "cooldown": 120, "ability_type": "mitigation",
             "description": "Absorbs all damage intended for a party member."},
        ],
    },
    {
        "name": "Warrior", "abbreviation": "WAR", "role": "tank", "color": "#cc4400",
        "abilities": [
            {"name": "Shake It Off", "duration": 15, "cooldown": 90, "ability_type": "shield",
             "description": "Creates a barrier around all nearby party members."},
            {"name": "Reprisal", "duration": 10, "cooldown": 60, "ability_type": "mitigation",
             "description": "Reduces damage dealt by nearby enemies by 10%."},
            {"name": "Nascent Flash", "duration": 8, "cooldown": 25, "ability_type": "regen",
             "description": "Grants regen and applies healing received boost to target."},
        ],
    },
    {
        "name": "Dark Knight", "abbreviation": "DRK", "role": "tank", "color": "#9944cc",
        "abilities": [
            {"name": "Dark Missionary", "duration": 15, "cooldown": 90, "ability_type": "mitigation",
             "description": "Reduces magic damage taken by all nearby party members by 10%."},
            {"name": "Reprisal", "duration": 10, "cooldown": 60, "ability_type": "mitigation",
             "description": "Reduces damage dealt by nearby enemies by 10%."},
            {"name": "The Blackest Night", "duration": 7, "cooldown": 15, "ability_type": "shield",
             "description": "Creates a barrier. If fully absorbed, grants Dark Arts."},
        ],
    },
    {
        "name": "Gunbreaker", "abbreviation": "GNB", "role": "tank", "color": "#886644",
        "abilities": [
            {"name": "Heart of Light", "duration": 15, "cooldown": 90, "ability_type": "mitigation",
             "description": "Reduces magic damage taken by all nearby party members by 10%."},
            {"name": "Reprisal", "duration": 10, "cooldown": 60, "ability_type": "mitigation",
             "description": "Reduces damage dealt by nearby enemies by 10%."},
            {"name": "Aurora", "duration": 18, "cooldown": 60, "ability_type": "regen",
             "description": "Grants a target a regen effect."},
        ],
    },
    {
        "name": "White Mage", "abbreviation": "WHM", "role": "healer", "color": "#ddddff",
        "abilities": [
            {"name": "Temperance", "duration": 20, "cooldown": 120, "ability_type": "mitigation",
             "description": "Reduces damage taken by 10% for nearby party members."},
            {"name": "Liturgy of the Bell", "duration": 20, "cooldown": 180, "ability_type": "regen",
             "description": "Summons a healing bell that responds to party HP loss."},
            {"name": "Asylum", "duration": 24, "cooldown": 90, "ability_type": "regen",
             "description": "Creates a healing ward that regens party members inside."},
        ],
    },
    {
        "name": "Scholar", "abbreviation": "SCH", "role": "healer", "color": "#8899ff",
        "abilities": [
            {"name": "Expedient", "duration": 20, "cooldown": 120, "ability_type": "mitigation",
             "description": "Reduces damage taken by 10% and increases movement speed."},
            {"name": "Fey Illumination", "duration": 20, "cooldown": 120, "ability_type": "mitigation",
             "description": "Reduces magic damage taken by 5% and boosts healing potency."},
            {"name": "Sacred Soil", "duration": 15, "cooldown": 30, "ability_type": "shield",
             "description": "Creates a zone reducing damage taken by 10% with regen."},
            {"name": "Deployment Tactics", "duration": 15, "cooldown": 90, "ability_type": "shield",
             "description": "Extends a shield effect to nearby party members."},
        ],
    },
    {
        "name": "Astrologian", "abbreviation": "AST", "role": "healer", "color": "#ffdd44",
        "abilities": [
            {"name": "Macrocosmos", "duration": 15, "cooldown": 180, "ability_type": "shield",
             "description": "Reduces damage by 10% and stores 50% of damage for later healing."},
            {"name": "Collective Unconscious", "duration": 18, "cooldown": 60, "ability_type": "mitigation",
             "description": "Creates a wheel granting regen and physical damage mitigation."},
            {"name": "Neutral Sect", "duration": 20, "cooldown": 120, "ability_type": "shield",
             "description": "Boosts healing and causes shields to apply after each heal."},
        ],
    },
    {
        "name": "Sage", "abbreviation": "SGE", "role": "healer", "color": "#44ccdd",
        "abilities": [
            {"name": "Panhaima", "duration": 15, "cooldown": 120, "ability_type": "shield",
             "description": "Applies a five-stack barrier to all nearby party members."},
            {"name": "Kerachole", "duration": 15, "cooldown": 30, "ability_type": "mitigation",
             "description": "Reduces damage taken by 10% with a regen for nearby party members."},
            {"name": "Holos", "duration": 20, "cooldown": 120, "ability_type": "mitigation",
             "description": "Reduces damage taken by 10% and applies a barrier."},
        ],
    },
]

SEED_ENCOUNTERS = [
    {
        "name": "Futures Rewritten (Ultimate)",
        "duration": 1200, "is_preset": True,
        "boss_actions": [
            {"name": "Fulgent Blade", "time_offset": 10, "damage_type": "raidwide"},
            {"name": "Hell's Judgment", "time_offset": 25, "damage_type": "raidwide"},
            {"name": "Cyclonic Break", "time_offset": 45, "damage_type": "raidwide"},
            {"name": "Blasting Zone", "time_offset": 62, "damage_type": "tankbuster"},
            {"name": "Powder Mark Trail", "time_offset": 78, "damage_type": "tankbuster"},
            {"name": "Fall of Faith", "time_offset": 95, "damage_type": "raidwide"},
            {"name": "Burnt Strike", "time_offset": 115, "damage_type": "raidwide"},
            {"name": "Blasting Zone", "time_offset": 130, "damage_type": "tankbuster"},
        ],
    },
    {
        "name": "The Omega Protocol (Ultimate)",
        "duration": 1080, "is_preset": True,
        "boss_actions": [
            {"name": "Program Loop", "time_offset": 8, "damage_type": "raidwide"},
            {"name": "Pile Pitch", "time_offset": 22, "damage_type": "tankbuster"},
            {"name": "Beyond Defense", "time_offset": 38, "damage_type": "tankbuster"},
            {"name": "Diffuse Wave Cannon", "time_offset": 55, "damage_type": "raidwide"},
            {"name": "Atomic Ray", "time_offset": 72, "damage_type": "raidwide"},
            {"name": "Wave Cannon", "time_offset": 90, "damage_type": "raidwide"},
            {"name": "Pile Pitch", "time_offset": 108, "damage_type": "tankbuster"},
        ],
    },
    {
        "name": "Abyssos: The Eighth Circle (Savage)",
        "duration": 720, "is_preset": True,
        "boss_actions": [
            {"name": "Aetherflail", "time_offset": 8, "damage_type": "raidwide"},
            {"name": "Limitless Desolation", "time_offset": 22, "damage_type": "raidwide"},
            {"name": "Tyrant's Unholy Darkness", "time_offset": 38, "damage_type": "tankbuster"},
            {"name": "Beastly Fury", "time_offset": 55, "damage_type": "raidwide"},
            {"name": "Dominion", "time_offset": 72, "damage_type": "raidwide"},
            {"name": "Tyrant's Flare II", "time_offset": 90, "damage_type": "raidwide"},
            {"name": "Tyrant's Unholy Darkness", "time_offset": 108, "damage_type": "tankbuster"},
            {"name": "Limitless Desolation", "time_offset": 130, "damage_type": "raidwide"},
            {"name": "Enrage", "time_offset": 690, "damage_type": "enrage"},
        ],
    },
]


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        print("Seeding jobs...")
        for job_data in SEED_JOBS:
            abilities_data = job_data.pop("abilities")
            existing = await session.execute(
                select(Job).where(Job.abbreviation == job_data["abbreviation"])
            )
            if existing.scalar_one_or_none():
                print(f"  Skipping {job_data['abbreviation']} (exists)")
                job_data["abilities"] = abilities_data
                continue
            job = Job(**job_data)
            session.add(job)
            await session.flush()
            for a in abilities_data:
                session.add(Ability(job_id=job.id, **a))
            print(f"  + {job.abbreviation} ({len(abilities_data)} abilities)")
            job_data["abilities"] = abilities_data

        print("\nSeeding encounters...")
        for enc_data in SEED_ENCOUNTERS:
            actions_data = enc_data.pop("boss_actions")
            existing = await session.execute(
                select(Encounter).where(Encounter.name == enc_data["name"])
            )
            if existing.scalar_one_or_none():
                print(f"  Skipping {enc_data['name']} (exists)")
                enc_data["boss_actions"] = actions_data
                continue
            enc = Encounter(**enc_data)
            session.add(enc)
            await session.flush()
            for a in actions_data:
                session.add(BossAction(encounter_id=enc.id, **a))
            print(f"  + {enc.name} ({len(actions_data)} actions)")
            enc_data["boss_actions"] = actions_data

        await session.commit()
    print("\nDone!")


if __name__ == "__main__":
    asyncio.run(seed())
