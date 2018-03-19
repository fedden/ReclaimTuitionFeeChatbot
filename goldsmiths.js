module.exports = {
  
  generateLatexFile: function(psid, first_name, last_name, student_email, student_number, tuition_fee, amount_days, amount_reimburse, include_signature=true, is_goldsmiths=true) {
    
    let uni;
    if (is_goldsmiths) {
      uni = 'Goldsmiths University of London';
    } else {
      uni = 'your university';
    }
    
    let latex = '\\documentclass{letter}\n\\usepackage{hyperref}\n\\usepackage{graphicx}\n\\usepackage{mathtools}\n'

    latex +=
`
\\DeclarePairedDelimiter\\floor{\\lfloor}{\\rfloor}

\\signature{${first_name} ${last_name}}

`;

    if (is_goldsmiths) {
      latex += `\\address{Warden’s Office \\\\ Ms Helen Keogh \\\\ Mr Patrick Loughrey \\\\ 
Deptford Town Hall Building \\\\ Room 101 \\\\ New Cross \\\\ London, UK \\\\ 
SE14 6NW \\\\ 020 7919 7901}

`;
    }
    
latex += `\\longindentation=0pt
\\begin{document}

\\begin{letter}{Student Number: ${student_number} \\\\ Email: ${student_email}}
\\opening{To the Warden's Office}

This letter is to request reasonable compensation for the loss of lectures and contact time with tutors as a result of the UCU strike action from February 22nd to March 16th.

I, as a student of ${uni}, demand that the institution refund a portion of my tuition, respective to my enrollment status and programme.

Due to the employer’s failure to protect the livelihoods of its staff, the UCU has organized a fourteen day strike, as a means of opposing the recent proposals that would damage the USS pension scheme. Consequently, the student body suffers a loss of critical mentorship and face time with the faculty, most notably in the loss of organized class time such as lectures, tutorials, workshops, and critiques.

Considering that for the duration of the strike students will not be accessing tuition or crossing the picket line to use Goldsmiths’ facilities, I believe I should be refunded the following amount: \\textbf{\\textsterling ${amount_reimburse}}

This amount was derived from the fraction of the days missed due to the strikes, $x$, out of the amount of days in the academic year, $y$, multiplied by the tution fees for this year $z$, which is then floored (rounded down) to the nearest pound sterling.

\\begin{equation}
\\floor*{\\frac{x}{y}z} = \\text{\\textsterling} \\floor*{\\frac{14}{${amount_days}} \\times ${tuition_fee}} = \\text{\\textsterling} ${amount_reimburse}
\\end{equation}

It is the responsibility of the institution to provide a complete and quality education to each of its students, to the fullest extent and duration that it was advertised. Additionally, I find the institution’s administration to be directly accountable for both the inception and the entire duration of the strike. At any point, the university administration can commit to meaningful negotiation that would fairly address the staff concerns and end the strike. As a result of the rising cost of university tuition, students are burdened by increasing levels of debt. It is irresponsible and unmerited for the university to demand each of its students increase their personal debt for a service that has been denied to them.

\\vspace{3em}

Sincerely,

`;

if (include_signature) {
  latex += `
\\includegraphics[height=12em]{${psid}.png}`;
}
    
    latex += `

${first_name} ${last_name}

\\end{letter}
\\end{document}`;  
    
    return latex;
  }
};