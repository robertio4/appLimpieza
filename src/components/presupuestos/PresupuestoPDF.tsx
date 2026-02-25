"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { PresupuestoCompleto } from "@/types/database";
import { DATOS_EMPRESA } from "@/lib/constants";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 4,
  },
  logoText: {
    fontSize: 8,
    color: "#666",
    textAlign: "center",
  },
  empresaInfo: {
    textAlign: "right",
  },
  empresaNombre: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  empresaDato: {
    fontSize: 9,
    color: "#444",
    marginBottom: 2,
  },
  presupuestoTitle: {
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    color: "#333",
    marginBottom: 20,
    textAlign: "center",
  },
  infoSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  clienteBox: {
    width: "48%",
    backgroundColor: "#f8f8f8",
    padding: 12,
    borderRadius: 4,
  },
  presupuestoBox: {
    width: "48%",
    padding: 12,
    borderLeft: "2px solid #333",
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#666",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  clienteNombre: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  clienteDato: {
    fontSize: 9,
    color: "#444",
    marginBottom: 2,
  },
  presupuestoNumero: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
  },
  presupuestoDato: {
    fontSize: 9,
    marginBottom: 4,
  },
  presupuestoDatoLabel: {
    color: "#666",
  },
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#333",
    padding: 10,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  tableHeaderCell: {
    color: "#fff",
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1px solid #eee",
    padding: 10,
    backgroundColor: "#fff",
  },
  tableRowAlt: {
    backgroundColor: "#fafafa",
  },
  tableCell: {
    fontSize: 9,
    color: "#333",
  },
  colConcepto: {
    width: "45%",
  },
  colCantidad: {
    width: "15%",
    textAlign: "center",
  },
  colPrecio: {
    width: "20%",
    textAlign: "right",
  },
  colTotal: {
    width: "20%",
    textAlign: "right",
  },
  totalsSection: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 30,
  },
  totalsBox: {
    width: 200,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottom: "1px solid #eee",
  },
  totalRowFinal: {
    borderBottom: "none",
    backgroundColor: "#333",
    padding: 10,
    borderRadius: 4,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 9,
    color: "#666",
  },
  totalValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
  },
  totalFinalLabel: {
    fontSize: 11,
    color: "#fff",
    fontFamily: "Helvetica-Bold",
  },
  totalFinalValue: {
    fontSize: 14,
    color: "#fff",
    fontFamily: "Helvetica-Bold",
  },
  footer: {
    position: "absolute",
    bottom: 40,
    left: 40,
    right: 40,
  },
  notasSection: {
    marginBottom: 15,
    padding: 12,
    backgroundColor: "#fffbeb",
    borderRadius: 4,
    borderLeft: "3px solid #f59e0b",
  },
  notasTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#92400e",
    marginBottom: 4,
  },
  notasText: {
    fontSize: 9,
    color: "#78350f",
  },
  validezSection: {
    padding: 12,
    backgroundColor: "#eff6ff",
    borderRadius: 4,
    borderLeft: "3px solid #3b82f6",
  },
  validezTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#1e40af",
    marginBottom: 4,
  },
  validezText: {
    fontSize: 9,
    color: "#1e40af",
  },
});

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

interface PresupuestoPDFProps {
  presupuesto: PresupuestoCompleto;
}

export function PresupuestoPDF({ presupuesto }: PresupuestoPDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoPlaceholder}>
            <Text style={styles.logoText}>LOGO</Text>
          </View>
          <View style={styles.empresaInfo}>
            <Text style={styles.empresaNombre}>{DATOS_EMPRESA.nombre}</Text>
            <Text style={styles.empresaDato}>{DATOS_EMPRESA.direccion}</Text>
            <Text style={styles.empresaDato}>NIF: {DATOS_EMPRESA.nif}</Text>
            <Text style={styles.empresaDato}>Tel: {DATOS_EMPRESA.telefono}</Text>
            <Text style={styles.empresaDato}>{DATOS_EMPRESA.email}</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.presupuestoTitle}>PRESUPUESTO</Text>

        {/* Client and Presupuesto Info */}
        <View style={styles.infoSection}>
          <View style={styles.clienteBox}>
            <Text style={styles.sectionTitle}>Cliente</Text>
            <Text style={styles.clienteNombre}>{presupuesto.cliente.nombre}</Text>
            {presupuesto.cliente.direccion && (
              <Text style={styles.clienteDato}>{presupuesto.cliente.direccion}</Text>
            )}
            {presupuesto.cliente.nif && (
              <Text style={styles.clienteDato}>NIF: {presupuesto.cliente.nif}</Text>
            )}
            {presupuesto.cliente.email && (
              <Text style={styles.clienteDato}>{presupuesto.cliente.email}</Text>
            )}
            {presupuesto.cliente.telefono && (
              <Text style={styles.clienteDato}>Tel: {presupuesto.cliente.telefono}</Text>
            )}
          </View>
          <View style={styles.presupuestoBox}>
            <Text style={styles.sectionTitle}>Detalles Presupuesto</Text>
            <Text style={styles.presupuestoNumero}>N.º {presupuesto.numero}</Text>
            <Text style={styles.presupuestoDato}>
              <Text style={styles.presupuestoDatoLabel}>Fecha de emisión: </Text>
              {formatDate(presupuesto.fecha)}
            </Text>
            <Text style={styles.presupuestoDato}>
              <Text style={styles.presupuestoDatoLabel}>Válido hasta: </Text>
              {formatDate(presupuesto.fecha_validez)}
            </Text>
          </View>
        </View>

        {/* Lines Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colConcepto]}>
              Concepto
            </Text>
            <Text style={[styles.tableHeaderCell, styles.colCantidad]}>
              Cantidad
            </Text>
            <Text style={[styles.tableHeaderCell, styles.colPrecio]}>
              Precio
            </Text>
            <Text style={[styles.tableHeaderCell, styles.colTotal]}>Total</Text>
          </View>
          {presupuesto.lineas_presupuesto.map((linea, index) => (
            <View
              key={linea.id}
              style={[
                styles.tableRow,
                index % 2 === 1 ? styles.tableRowAlt : {},
              ]}
            >
              <Text style={[styles.tableCell, styles.colConcepto]}>
                {linea.concepto}
              </Text>
              <Text style={[styles.tableCell, styles.colCantidad]}>
                {linea.cantidad}
              </Text>
              <Text style={[styles.tableCell, styles.colPrecio]}>
                {formatCurrency(linea.precio_unitario)}
              </Text>
              <Text style={[styles.tableCell, styles.colTotal]}>
                {formatCurrency(linea.total)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>
                {formatCurrency(presupuesto.subtotal)}
              </Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>IVA (21%)</Text>
              <Text style={styles.totalValue}>
                {formatCurrency(presupuesto.iva)}
              </Text>
            </View>
            <View style={[styles.totalRow, styles.totalRowFinal]}>
              <Text style={styles.totalFinalLabel}>Total</Text>
              <Text style={styles.totalFinalValue}>
                {formatCurrency(presupuesto.total)}
              </Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          {presupuesto.notas && (
            <View style={styles.notasSection}>
              <Text style={styles.notasTitle}>Notas</Text>
              <Text style={styles.notasText}>{presupuesto.notas}</Text>
            </View>
          )}
          <View style={styles.validezSection}>
            <Text style={styles.validezTitle}>Validez del presupuesto</Text>
            <Text style={styles.validezText}>
              Este presupuesto es válido hasta el {formatDate(presupuesto.fecha_validez)}.
              {" "}Los precios y condiciones aquí reflejados están sujetos a cambios pasada la fecha de validez.
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
