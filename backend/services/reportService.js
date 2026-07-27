const Complaint = require('../models/Complaint');
const Feedback = require('../models/Feedback');
const User = require('../models/User');

function getDateRange(period) {
  const now = new Date();
  const to = now.toISOString().split('T')[0];
  let from;
  if (period === 'daily') {
    from = to;
  } else if (period === 'weekly') {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    from = d.toISOString().split('T')[0];
  } else if (period === 'monthly') {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 1);
    from = d.toISOString().split('T')[0];
  } else if (period === 'yearly') {
    const d = new Date(now);
    d.setFullYear(d.getFullYear() - 1);
    from = d.toISOString().split('T')[0];
  }
  return { from, to };
}

const reportService = {
  generateReport(params = {}) {
    const { type, from, to } = params;
    switch (type) {
      case 'summary': return this.getSummaryReport(from, to);
      case 'detailed': return this.getDetailedReport(from, to);
      case 'department': return this.getDepartmentReport();
      case 'village': return this.getVillageReport();
      default: return this.getSummaryReport(from, to);
    }
  },

  getDailyReport() {
    const { from, to } = getDateRange('daily');
    return this.getDetailedReport(from, to);
  },

  getWeeklyReport() {
    const { from, to } = getDateRange('weekly');
    return this.getDetailedReport(from, to);
  },

  getMonthlyReport() {
    const { from, to } = getDateRange('monthly');
    return this.getDetailedReport(from, to);
  },

  getYearlyReport() {
    const { from, to } = getDateRange('yearly');
    return this.getDetailedReport(from, to);
  },

  getSummaryReport(from, to) {
    const query = {};
    if (from) query.from = from;
    if (to) query.to = to;
    const result = Complaint.findAll(query);
    const stats = Complaint.getOverallStats();
    const avgRating = Feedback.getAverageRating();
    return {
      type: 'summary',
      generatedAt: new Date().toISOString(),
      totalComplaints: stats.total,
      byStatus: {
        pending: stats.pending,
        inProgress: stats.inProgress,
        resolved: stats.resolved,
        rejected: stats.rejected
      },
      averageRating: avgRating.average,
      totalFeedbacks: avgRating.total,
      totalUsers: User.count(),
      data: result.complaints
    };
  },

  getDetailedReport(from, to) {
    const query = {};
    if (from) query.from = from;
    if (to) query.to = to;
    const result = Complaint.findAll({ ...query, limit: 1000 });
    return {
      type: 'detailed',
      period: from ? { from, to } : 'all',
      generatedAt: new Date().toISOString(),
      totalComplaints: result.total,
      columns: [
        { header: 'ID', accessor: 'complaintId' },
        { header: 'Title', accessor: 'title' },
        { header: 'Category', accessor: 'category' },
        { header: 'Status', accessor: 'status' },
        { header: 'Priority', accessor: 'priority' },
        { header: 'User', accessor: 'userName' },
        { header: 'Village', accessor: 'village' },
        { header: 'Created', accessor: 'createdAt' }
      ],
      data: result.complaints
    };
  },

  getDepartmentReport() {
    return {
      type: 'department',
      generatedAt: new Date().toISOString(),
      data: Complaint.getDepartmentStats()
    };
  },

  getVillageReport() {
    return {
      type: 'village',
      generatedAt: new Date().toISOString(),
      data: Complaint.getVillageStats()
    };
  },

  exportCSV(params = {}) {
    const result = Complaint.findAll({ ...params, limit: 10000 });
    const rows = result.complaints;
    const headers = ['ComplaintID','Title','Category','Status','Priority','User','Village','District','CreatedAt'];
    const lines = [headers.join(',')];
    rows.forEach(r => {
      const vals = [
        r.complaintId || r.id,
        (r.title || '').replace(/"/g, '""'),
        r.category || '',
        r.status || '',
        r.priority || '',
        (r.userName || '').replace(/"/g, '""'),
        r.village || '',
        r.district || '',
        r.createdAt || ''
      ];
      lines.push(vals.map(v => `"${v}"`).join(','));
    });
    return lines.join('\n');
  },

  exportExcel(params = {}) {
    const { from, to } = params;
    const query = {};
    if (from) query.from = from;
    if (to) query.to = to;
    const result = Complaint.findAll({ ...query, limit: 10000 });
    const rows = result.complaints;
    const headers = ['ComplaintID','Title','Category','Status','Priority','User','Village','District','CreatedAt'];
    const xmlRows = rows.map(r => {
      const vals = headers.map(h => {
        const map = { ComplaintID: r.complaintId || r.id, Title: r.title, Category: r.category, Status: r.status, Priority: r.priority, User: r.userName, Village: r.village, District: r.district, CreatedAt: r.createdAt };
        return `<Cell><Data ss:Type="String">${(map[h] || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</Data></Cell>`;
      }).join('');
      return `<Row>${vals}</Row>`;
    }).join('');
    const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Report">
  <Table>
   <Row>${headers.map(h => `<Cell><Data ss:Type="String">${h}</Data></Cell>`).join('')}</Row>
   ${xmlRows}
  </Table>
 </Worksheet>
</Workbook>`;
    return Buffer.from(xml);
  }
};

module.exports = reportService;
