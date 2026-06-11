from dotenv import load_dotenv
from pathlib import Path
load_dotenv(Path(__file__).parent / ".env")

import os
import logging
from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware

from constants import VITA_SHADES, FDI_TEETH, ALL_STATUSES, ZIRCONIA_STAGES, \
    IMPRESSION_PRESTAGES, TRIAL_STAGES, FILE_ISSUE_REASONS, REMAKE_REASONS, WHATSAPP_EVENTS
from seed import seed
from routes import auth_routes, catalog_routes, people_routes, order_routes, whatsapp_routes

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="Shree Dental Lab API")
api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root():
    return {"message": "Shree Dental Lab API"}


@api_router.get("/meta")
async def meta():
    return {
        "shades": VITA_SHADES, "fdi_teeth": FDI_TEETH, "statuses": ALL_STATUSES,
        "zirconia_stages": ZIRCONIA_STAGES, "impression_prestages": IMPRESSION_PRESTAGES,
        "trial_stages": TRIAL_STAGES, "file_issue_reasons": FILE_ISSUE_REASONS,
        "remake_reasons": REMAKE_REASONS, "whatsapp_events": WHATSAPP_EVENTS,
    }


api_router.include_router(auth_routes.router)
api_router.include_router(catalog_routes.router)
api_router.include_router(people_routes.router)
api_router.include_router(order_routes.router)
api_router.include_router(whatsapp_routes.router)

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    try:
        await seed()
        logger.info("Seed complete")
    except Exception as e:
        logger.exception("Seed failed: %s", e)
