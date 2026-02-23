"""
Diagnostic engine -- evaluation logic for step-based problems.

Step-based flow:
  - Student selects a StepOption by ID at each Step.
  - If is_correct -> advance to next step, reveal explanation.
  - If wrong -> return feedback, allow retry (with hint on 2nd attempt).
"""

import re
from app.models import db, ErrorPattern, Checkpoint, StudentProgress, Concept


def _parse_numeric(val):
    """Try to extract a float from a string value. Returns None if not numeric."""
    if isinstance(val, (int, float)):
        return float(val)
    if isinstance(val, str):
        val = val.strip()
        m = re.match(r'^[-+]?\d*\.?\d+', val)
        if m:
            return float(m.group())
    return None


def _answers_match(student_answer: str, correct_answer: str, tolerance: float = 0.01) -> bool:
    """Compare two answers: tries numeric first, falls back to case-insensitive string."""
    s_num = _parse_numeric(student_answer)
    c_num = _parse_numeric(correct_answer)
    if s_num is not None and c_num is not None:
        return abs(s_num - c_num) <= tolerance
    # String comparison (case-insensitive, stripped)
    return str(student_answer).strip().lower() == str(correct_answer).strip().lower()


# ---------------------------------------------------------------------------
# Primary evaluation entry point
# ---------------------------------------------------------------------------

def match_error_pattern(checkpoint_id: int, student_answer: str) -> ErrorPattern | None:
    """
    Find the highest-confidence ErrorPattern whose trigger_value matches
    the student's answer (string or numeric comparison).
    """
    patterns = ErrorPattern.query.filter_by(checkpoint_id=checkpoint_id).all()

    matches = []
    for p in patterns:
        s_num = _parse_numeric(student_answer)
        t_num = _parse_numeric(p.trigger_value)
        if s_num is not None and t_num is not None:
            if abs(s_num - t_num) <= p.trigger_tolerance:
                matches.append(p)
        else:
            # String comparison
            if str(student_answer).strip().lower() == str(p.trigger_value).strip().lower():
                matches.append(p)

    if not matches:
        return None

    matches.sort(key=lambda p: p.confidence, reverse=True)
    return matches[0]

    # Guard: option must belong to this step
    if option is None or option.step_id != step.id:
        return {
            "correct": False,
            "feedback": "Invalid option selected. Please choose one of the options provided.",
            "explanation": None,
            "hint": None,
            "next_action": "retry",
        }

    if option.is_correct:
        return {
            "correct": True,
            "feedback": "Correct! Great work.",
            "explanation": step.explanation,
            "hint": None,
            "next_action": "continue",
        }

    # Wrong answer
    if attempt_number == 1:
        feedback = "Not quite right. Review the step description and try again."
        hint = step.step_description
    else:
        # Hint: reveal the correct answer text on 2nd+ attempt
        feedback = f"Still incorrect. Hint: look for the option that matches -- {step.correct_answer[:80]}..."
        hint = step.correct_answer

    return {
        "correct": False,
        "feedback": feedback,
        "explanation": None,
        "hint": hint,
        "next_action": "retry",
    }


# ---------------------------------------------------------------------------
# Progress helpers (shared with sessions route)
# ---------------------------------------------------------------------------

def evaluate_checkpoint_answer(
    checkpoint: Checkpoint,
    student_answer: str,
    attempt_number: int,
    student_id: int,
) -> dict:
    """
    Evaluate a student's answer at a checkpoint and return the full response payload.
    Accepts string-based answers for both numeric and MCQ checkpoints.
    """
    is_correct = _answers_match(student_answer, checkpoint.correct_answer, checkpoint.tolerance)

    progress = StudentProgress.query.filter_by(
        student_id=student_id,
        concept_id=concept_id,
    ).first()

    now = datetime.now(timezone.utc)

    if progress is None:
        progress = StudentProgress(
            student_id=student_id,
            concept_id=concept_id,
            status="in_progress",
            attempts=1,
            last_attempted_at=now,
        )
        db.session.add(progress)
    else:
        progress.attempts = (progress.attempts or 0) + 1
        progress.last_attempted_at = now

    db.session.commit()
