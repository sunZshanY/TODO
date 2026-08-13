import { useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Input,
  makeStyles,
  Radio,
  RadioGroup,
  Textarea,
  tokens,
} from "@fluentui/react-components";
import type { Priority, Task, TaskInput } from "../types";

const useStyles = makeStyles({
  form: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
  },
  row: {
    display: "flex",
    gap: tokens.spacingHorizontalL,
    alignItems: "flex-end",
  },
});

interface Props {
  open: boolean;
  task: Task | null;
  onClose: () => void;
  onSave: (input: TaskInput) => void;
}

const EMPTY: TaskInput = {
  title: "",
  description: "",
  priority: "medium",
  dueDate: null,
};

export function TaskFormDialog({ open, task, onClose, onSave }: Props) {
  const styles = useStyles();
  const [form, setForm] = useState<TaskInput>(EMPTY);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setForm(
        task
          ? {
              title: task.title,
              description: task.description,
              priority: task.priority,
              dueDate: task.dueDate,
            }
          : { ...EMPTY },
      );
      setError("");
    }
  }, [open, task]);

  const submit = () => {
    const title = form.title.trim();
    if (!title) {
      setError("任务标题不能为空");
      return;
    }
    onSave({ ...form, title, description: form.description.trim() });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(_e, d) => d.open ? undefined : onClose()}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{task ? "编辑任务" : "新建任务"}</DialogTitle>
          <DialogContent>
            <div className={styles.form}>
              <Field
                label="任务标题"
                required
                validationState={error ? "error" : undefined}
                validationMessage={error || undefined}
              >
                <Input
                  value={form.title}
                  maxLength={200}
                  placeholder="请输入任务标题"
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
              </Field>

              <Field label="任务描述">
                <Textarea
                  value={form.description}
                  maxLength={2000}
                  placeholder="添加详细描述（可选）"
                  rows={3}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                />
              </Field>

              <div className={styles.row}>
                <Field label="优先级">
                  <RadioGroup
                    value={form.priority}
                    onChange={(_, d) =>
                      setForm((f) => ({ ...f, priority: d.value as Priority }))
                    }
                  >
                    <Radio value="high" label="🔴 高" />
                    <Radio value="medium" label="🟡 中" />
                    <Radio value="low" label="🟢 低" />
                  </RadioGroup>
                </Field>

                <Field label="截止日期">
                  <Input
                    type="date"
                    value={form.dueDate ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        dueDate: e.target.value || null,
                      }))
                    }
                  />
                </Field>
              </div>
            </div>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onClose}>
              取消
            </Button>
            <Button appearance="primary" onClick={submit}>
              {task ? "保存修改" : "创建任务"}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
