"use client";

import { useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import esLocale from "@fullcalendar/core/locales/es";
import type { EventClickArg, DateSelectArg } from "@fullcalendar/core";
import type { TrabajoConCliente } from "@/types/database";
import { TIPO_SERVICIO_COLORS } from "@/lib/constants";

interface CalendarViewProps {
  trabajos: TrabajoConCliente[];
  onEventClick: (trabajo: TrabajoConCliente) => void;
  onDateSelect: (start: Date) => void;
}

export function CalendarView({
  trabajos,
  onEventClick,
  onDateSelect,
}: CalendarViewProps) {
  const calendarRef = useRef<FullCalendar>(null);

  // Convert trabajos to FullCalendar events
  const events = trabajos.map((trabajo) => ({
    id: trabajo.id,
    title: `${trabajo.cliente.nombre} - ${trabajo.titulo}`,
    start: trabajo.fecha_inicio,
    end: trabajo.fecha_fin,
    backgroundColor: TIPO_SERVICIO_COLORS[trabajo.tipo_servicio],
    borderColor: TIPO_SERVICIO_COLORS[trabajo.tipo_servicio],
    extendedProps: {
      trabajo,
    },
  }));

  const handleEventClick = (info: EventClickArg) => {
    const trabajo = info.event.extendedProps.trabajo as TrabajoConCliente;
    onEventClick(trabajo);
  };

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    onDateSelect(selectInfo.start);
    // Clear selection
    selectInfo.view.calendar.unselect();
  };

  return (
    <div className="bg-white rounded-lg border border-neutral-200 p-4">
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
        initialView="timeGridWeek"
        locale={esLocale}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
        }}
        buttonText={{
          today: "Hoy",
          month: "Mes",
          week: "Semana",
          day: "Día",
          list: "Lista",
        }}
        events={events}
        eventClick={handleEventClick}
        select={handleDateSelect}
        selectable={true}
        selectMirror={true}
        dayMaxEvents={true}
        weekends={true}
        height="auto"
        slotMinTime="06:00:00"
        slotMaxTime="22:00:00"
        allDaySlot={false}
        nowIndicator={true}
        eventTimeFormat={{
          hour: "2-digit",
          minute: "2-digit",
          meridiem: false,
        }}
        slotLabelFormat={{
          hour: "2-digit",
          minute: "2-digit",
          meridiem: false,
        }}
        // Styling
        eventClassNames="cursor-pointer hover:opacity-80 transition-opacity"
      />

      <style jsx global>{`
        .fc {
          font-family: inherit;
        }

        .fc-theme-standard td,
        .fc-theme-standard th {
          border-color: #e5e5e5;
        }

        .fc-button-primary {
          background-color: #171717 !important;
          border-color: #171717 !important;
        }

        .fc-button-primary:hover {
          background-color: #404040 !important;
          border-color: #404040 !important;
        }

        .fc-button-primary:disabled {
          background-color: #a3a3a3 !important;
          border-color: #a3a3a3 !important;
        }

        .fc-button-active {
          background-color: #404040 !important;
          border-color: #404040 !important;
        }

        .fc-event {
          cursor: pointer;
          border-radius: 4px;
          padding: 2px 4px;
        }

        .fc-event:hover {
          opacity: 0.8;
        }

        .fc-event-title {
          font-weight: 500;
          font-size: 0.875rem;
        }

        .fc-daygrid-event {
          white-space: normal !important;
        }

        .fc-timegrid-event {
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
}
