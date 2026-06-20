declare module 'html2pdf.js' {
  interface Html2PdfOptions {
    margin?: number | [number, number, number, number]
    filename?: string
    image?: { type?: string; quality?: number }
    html2canvas?: Record<string, unknown>
    jsPDF?: Record<string, unknown>
    pagebreak?: Record<string, unknown>
    enableLinks?: boolean
  }

  interface Html2PdfInstance {
    set: (options: Html2PdfOptions) => Html2PdfInstance
    from: (el: HTMLElement | string) => Html2PdfInstance
    save: () => Promise<void>
    output: (type: string, opts?: any) => Promise<unknown>
  }

  interface Html2PdfFactory {
    (): Html2PdfInstance
    set: (options: Html2PdfOptions) => Html2PdfInstance
  }

  const html2pdf: Html2PdfFactory
  export default html2pdf
}