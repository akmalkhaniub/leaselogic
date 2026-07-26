"""
Commercial Lease Escalation & Total Occupancy Cost Engine for LeaseLogic
Calculates annual rent escalations, CAM charges, CPI adjustments, and multi-year lease projections.
"""
from typing import Dict, Any, List

class LeaseCalculatorEngine:
    """Computes lease cost projections and escalation schedules."""

    @staticmethod
    def calculate_multiyear_projection(
        initial_monthly_rent_usd: float,
        annual_escalation_pct: float,
        lease_term_years: int = 5,
        monthly_cam_charges_usd: float = 500.0
    ) -> Dict[str, Any]:
        """Generate annual lease schedule with total occupancy cost projections."""
        
        yearly_schedule = []
        cumulative_cost = 0.0
        current_monthly_rent = initial_monthly_rent_usd

        for year in range(1, lease_term_years + 1):
            annual_base = current_monthly_rent * 12.0
            annual_cam = monthly_cam_charges_usd * 12.0
            annual_total = annual_base + annual_cam
            cumulative_cost += annual_total

            yearly_schedule.append({
                "year": year,
                "monthly_rent_usd": round(current_monthly_rent, 2),
                "annual_base_usd": round(annual_base, 2),
                "annual_cam_usd": round(annual_cam, 2),
                "annual_total_usd": round(annual_total, 2),
                "cumulative_cost_usd": round(cumulative_cost, 2)
            })

            # Apply annual escalation
            current_monthly_rent *= (1.0 + (annual_escalation_pct / 100.0))

        return {
            "initial_monthly_rent_usd": initial_monthly_rent_usd,
            "annual_escalation_pct": annual_escalation_pct,
            "lease_term_years": lease_term_years,
            "total_occupancy_cost_usd": round(cumulative_cost, 2),
            "yearly_schedule": yearly_schedule
        }
