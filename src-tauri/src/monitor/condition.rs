//! Recursive evaluator for rule condition trees.

use crate::types::{ComparisonOp, Condition, MemoryThresholdType, Metric, ProcessInfo};

/// Recursively evaluate a condition tree against a process.
///
/// Visible to the parent `monitor` module only; external callers should
/// configure rules through [`crate::types::Rule`] and let the engine
/// invoke this during the monitoring tick.
pub(super) fn evaluate_condition(condition: &Condition, proc: &ProcessInfo) -> bool {
    match condition {
        Condition::Leaf {
            metric,
            threshold,
            memory_threshold_type,
            comparison,
        } => {
            let value = match metric {
                Metric::Cpu => proc.cpu_usage,
                Metric::Memory => match memory_threshold_type {
                    MemoryThresholdType::Mb => proc.memory_mb,
                    MemoryThresholdType::Percent => proc.memory_percent,
                },
                Metric::ProcessState => 0.0,
            };
            match comparison {
                ComparisonOp::Gt => value > *threshold,
                ComparisonOp::Gte => value >= *threshold,
                ComparisonOp::Lt => value < *threshold,
                ComparisonOp::Lte => value <= *threshold,
                ComparisonOp::Eq => (value - *threshold).abs() < f32::EPSILON,
            }
        }
        Condition::And(conditions) => conditions.iter().all(|c| evaluate_condition(c, proc)),
        Condition::Or(conditions) => conditions.iter().any(|c| evaluate_condition(c, proc)),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_proc(name: &str, display: &str, cpu: f32, mem_mb: f32, mem_pct: f32) -> ProcessInfo {
        ProcessInfo {
            pid: 1,
            name: name.to_string(),
            display_name: display.to_string(),
            cpu_usage: cpu,
            memory_mb: mem_mb,
            memory_percent: mem_pct,
            cmd: String::new(),
            parent_pid: 0,
            user: String::new(),
            start_time: String::new(),
            threads: 0,
            status: String::new(),
        }
    }

    #[test]
    fn evaluate_condition_leaf_cpu_gt() {
        let cond = Condition::Leaf {
            metric: Metric::Cpu,
            threshold: 50.0,
            memory_threshold_type: MemoryThresholdType::Percent,
            comparison: ComparisonOp::Gt,
        };
        let proc = make_proc("p", "p", 60.0, 0.0, 0.0);
        assert!(evaluate_condition(&cond, &proc));
        let proc2 = make_proc("p", "p", 40.0, 0.0, 0.0);
        assert!(!evaluate_condition(&cond, &proc2));
    }

    #[test]
    fn evaluate_condition_memory_mb_lte() {
        let cond = Condition::Leaf {
            metric: Metric::Memory,
            threshold: 100.0,
            memory_threshold_type: MemoryThresholdType::Mb,
            comparison: ComparisonOp::Lte,
        };
        let proc = make_proc("p", "p", 0.0, 100.0, 0.0);
        assert!(evaluate_condition(&cond, &proc));
    }

    #[test]
    fn evaluate_condition_and_short_circuits_false() {
        let cond = Condition::And(vec![
            Condition::Leaf {
                metric: Metric::Cpu,
                threshold: 10.0,
                memory_threshold_type: MemoryThresholdType::Percent,
                comparison: ComparisonOp::Gt,
            },
            Condition::Leaf {
                metric: Metric::Memory,
                threshold: 50.0,
                memory_threshold_type: MemoryThresholdType::Percent,
                comparison: ComparisonOp::Gt,
            },
        ]);
        let proc_pass = make_proc("p", "p", 20.0, 0.0, 60.0);
        let proc_fail = make_proc("p", "p", 20.0, 0.0, 40.0);
        assert!(evaluate_condition(&cond, &proc_pass));
        assert!(!evaluate_condition(&cond, &proc_fail));
    }

    #[test]
    fn evaluate_condition_or_any_true() {
        let cond = Condition::Or(vec![
            Condition::Leaf {
                metric: Metric::Cpu,
                threshold: 90.0,
                memory_threshold_type: MemoryThresholdType::Percent,
                comparison: ComparisonOp::Gt,
            },
            Condition::Leaf {
                metric: Metric::Memory,
                threshold: 50.0,
                memory_threshold_type: MemoryThresholdType::Percent,
                comparison: ComparisonOp::Gt,
            },
        ]);
        let proc = make_proc("p", "p", 10.0, 0.0, 60.0);
        assert!(evaluate_condition(&cond, &proc));
    }
}
