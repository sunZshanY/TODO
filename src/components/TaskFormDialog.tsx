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
  Select,
  Textarea,
  tokens,
} from "@fluentui/react-components";
import type { Priority, Task, TaskInput, TaskType } from "../types";

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
    "@media (max-width: 480px)": {
      flexDirection: "column",
      alignItems: "stretch",
      gap: tokens.spacingVerticalS,
    },
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
  category: "默认",
  type: "list",
  repeatEveryDays: null,
  repeatEndsAt: null,
};

/** 将存储格式转换为 datetime-local 输入框所需的值 */
function toDateTimeInput(value: string | null): string {
  if (!value) return "";
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00` : value;
}

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
              category: task.category,
              type: task.type,
              repeatEveryDays: task.repeatEveryDays ?? null,
              repeatEndsAt: task.repeatEndsAt ?? null,
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
    const repeatDays =
      form.repeatEveryDays && form.repeatEveryDays > 0
        ? Math.floor(form.repeatEveryDays)
        : null;
    if (repeatDays && !form.dueDate) {
      setError("设置重复后请填写截止日期（作为首次重复日期）");
      return;
    }
    onSave({
      ...form,
      title,
      description: form.description.trim(),
      repeatEveryDays: repeatDays,
      repeatEndsAt: repeatDays ? form.repeatEndsAt || null : null,
    });
    onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(_e, d) => {
        if (!d.open) onClose();
      }}
    >
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
                <Field label="类别">
                  <Input
                    value={form.category}
                    maxLength={50}
                    placeholder="例如：工作 / 生活 / 默认"
                    onChange={(e) =>
                      setForm((f) => ({ ...f, category: e.target.value }))
                    }
                  />
                </Field>
                <Field label="类型">
                  <Select
                    value={form.type}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, type: e.target.value as TaskType }))
                    }
                  >
                    <option value="list">清单</option>
                    <option value="schedule">日程表</option>
                  </Select>
                </Field>
              </div>

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

                <Field label="截止日期与时间">
                  <Input
                    type="datetime-local"
                    value={toDateTimeInput(form.dueDate)}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        dueDate: e.target.value || null,
                      }))
                    }
                  />
                </Field>
              </div>

              <div className={styles.row}>
                <Field
                  label="重复间隔（天）"
                  hint="留空或 0 表示不重复，完成任务后自动顺延到下一个日期"
                >
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={
                      form.repeatEveryDays
                        ? String(form.repeatEveryDays)
                        : ""
                    }
                    placeholder="例如：1（每天）/ 7（每周）"
                    onChange={(e) => {
                      const v = e.target.value;
                      const n = v ? Number(v) : null;
                      setForm((f) => ({
                        ...f,
                        repeatEveryDays:
                          n !== null && Number.isFinite(n) ? Math.floor(n) : null,
                      }));
                    }}
                  />
                </Field>
                <Field
                  label="重复结束日期"
                  hint="可选，到该日期后不再重复"
                >
                  <Input
                    type="date"
                    value={form.repeatEndsAt ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        repeatEndsAt: e.target.value || null,
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
