import { renderBadge, renderProgress } from "../scripts/ui.js";

const STATUS_OPTIONS = [
  "planificada",
  "en_progreso",
  "finalizada",
  "atrasada",
  "en_revision"
];

const meta = {
  title: "Sistema/UI Helpers",
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: "Helpers visuales reales usados por Control Obras para estados y progreso operativo."
      }
    }
  },
  argTypes: {
    status: {
      control: "select",
      options: STATUS_OPTIONS
    },
    progress: {
      control: { type: "range", min: 0, max: 100, step: 5 }
    },
    width: {
      control: "text"
    },
    title: {
      control: "text"
    },
    note: {
      control: "text"
    }
  },
  args: {
    title: "Proyecto 2712/26",
    note: "Estado actual y avance general del proyecto",
    status: "planificada",
    progress: 35,
    width: "320px"
  }
};

export default meta;

function renderStatusCard(args) {
  return `
    <section class="card" style="max-width: 420px;">
      <div class="card-header">
        <div>
          <h2>${args.title}</h2>
          <p>${args.note}</p>
        </div>
        ${renderBadge(args.status)}
      </div>
      <div style="display:grid; gap:12px; padding-top: 8px;">
        <div>
          <p class="project-summary-label">Avance General</p>
          ${renderProgress(args.progress, args.width)}
        </div>
      </div>
    </section>
  `;
}

export const Default = {
  name: "Default",
  render: renderStatusCard
};

export const EnProgreso = {
  name: "En progreso",
  args: {
    status: "en_progreso",
    progress: 65,
    note: "Producción en fábrica en curso"
  },
  render: renderStatusCard
};

export const Finalizada = {
  name: "Finalizada",
  args: {
    status: "finalizada",
    progress: 100,
    note: "Proyecto cerrado y entregado"
  },
  render: renderStatusCard
};
