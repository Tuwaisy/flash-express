
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

export const exportToPdf = (title: string, head: string[][], body: any[][], fileName:string) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    autoTable(doc, {
        head: head,
        body: body,
        startY: 30,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229] }, // Indigo 600
    });
    doc.save(`${fileName}_${new Date().toISOString().split('T')[0]}.pdf`);
};


/**
 * Escapes a value for CSV format. If the value contains a comma, double quote, or newline,
 * it will be wrapped in double quotes. Existing double quotes will be escaped by doubling them.
 * @param value The value to escape.
 * @returns The escaped string.
 */
const escapeCsvValue = (value: any): string => {
    const stringValue = String(value == null ? '' : value);
    if (/[",\n]/.test(stringValue)) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
};

/**
 * Converts an array of objects or arrays into a CSV string and triggers a download.
 * @param headers An array of strings for the CSV header row.
 * @param data An array of arrays representing the rows.
 * @param fileName The name of the file to be downloaded (without extension).
 */
export const exportToCsv = (headers: string[], data: any[][], fileName: string) => {
    const csvRows = [
        headers.join(','), // header row
        ...data.map(row => 
            row.map(escapeCsvValue).join(',')
        )
    ];
    
    const csvString = csvRows.join('\n');
    
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement('a');
    if (link.download !== undefined) { // feature detection
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${fileName}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
};

/**
 * Generates a PDF with multiple shipping labels in A5 format
 * @param labelElements Array of DOM elements containing the labels to convert
 * @param fileName The name of the PDF file
 */
export const generateLabelsPDF = async (labelElements: HTMLElement[], fileName: string) => {
    const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a5'
    });

    for (let i = 0; i < labelElements.length; i++) {
        if (i > 0) {
            pdf.addPage();
        }

        try {
            const canvas = await html2canvas(labelElements[i], {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                width: 820, // A5 landscape width in pixels at 96 DPI
                height: 580  // A5 landscape height in pixels at 96 DPI
            });

            const imgData = canvas.toDataURL('image/png');
            
            // A5 landscape dimensions: 210mm x 148mm
            pdf.addImage(imgData, 'PNG', 0, 0, 210, 148);
        } catch (error) {
            console.error('Error generating canvas for label', i, ':', error);
            // Add a placeholder page with error message
            pdf.setFontSize(16);
            pdf.text('Error generating label', 20, 20);
        }
    }

    pdf.save(`${fileName}_${new Date().toISOString().split('T')[0]}.pdf`);
};
